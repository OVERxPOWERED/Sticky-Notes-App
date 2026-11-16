const request = require('supertest');
const { app } = require('../../src/app');
const { prisma } = require('../../src/lib/prisma');
const { generateToken } = require('../../src/lib/jwt');
const { hashPassword } = require('../../src/lib/password');

describe('Notes API - Search, Pagination & Tag Filtering', () => {
  let user1, user2, token1, token2;
  const testTags = ['work', 'personal', 'urgent', 'ideas', 'archive'];
  const notesPerUser = 25;

  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.noteTag.deleteMany();
    await prisma.note.deleteMany();
    await prisma.tag.deleteMany();
    await prisma.user.deleteMany();

    const passwordHash = await hashPassword('password123');

    user1 = await prisma.user.create({
      data: {
        email: 'user1@test.com',
        passwordHash,
        name: 'Test User 1',
      },
    });

    user2 = await prisma.user.create({
      data: {
        email: 'user2@test.com',
        passwordHash,
        name: 'Test User 2',
      },
    });

    token1 = generateToken({ userId: user1.id, email: user1.email });
    token2 = generateToken({ userId: user2.id, email: user2.email });

    const tags = await Promise.all(
      testTags.map((name) =>
        prisma.tag.create({
          data: { name, userId: user1.id },
        })
      )
    );

    const tagMap = Object.fromEntries(tags.map((t) => [t.name, t.id]));

    const notesData = [];
    for (let i = 0; i < notesPerUser; i++) {
      const isArchived = i >= 20;
      const tagNames = testTags.slice(0, (i % 3) + 1);
      notesData.push({
        title: `Note ${i + 1} - ${tagNames.join(' ')}`,
        content: `Content for note ${i + 1}. This note is about ${tagNames.join(' and ')}.`,
        isArchived,
        userId: user1.id,
        tags: {
          create: tagNames.map((name) => ({
            tagId: tagMap[name],
          })),
        },
      });
    }

    for (let i = 0; i < 10; i++) {
      await prisma.note.create({
        data: {
          title: `User2 Note ${i + 1}`,
          content: `User2 content ${i + 1}`,
          isArchived: i >= 8,
          userId: user2.id,
        },
      });
    }

    await Promise.all(
      notesData.map((note) => prisma.note.create({ data: note }))
    );
  });

  const authRequest = (token) => request(app).set('Authorization', `Bearer ${token}`);

  describe('GET /api/notes - Pagination', () => {
    it('returns paginated results with correct metadata', async () => {
      const res = await authRequest(token1).get('/api/notes').query({ page: 1, limit: 10 });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
      expect(res.body.data).toHaveLength(10);
      expect(res.body.meta).toEqual({
        page: 1,
        limit: 10,
        totalItems: 25,
        totalPages: 3,
        hasNextPage: true,
        hasPrevPage: false,
      });
    });

    it('returns second page correctly', async () => {
      const res = await authRequest(token1).get('/api/notes').query({ page: 2, limit: 10 });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(10);
      expect(res.body.meta).toEqual({
        page: 2,
        limit: 10,
        totalItems: 25,
        totalPages: 3,
        hasNextPage: true,
        hasPrevPage: true,
      });
    });

    it('returns last page with remaining items', async () => {
      const res = await authRequest(token1).get('/api/notes').query({ page: 3, limit: 10 });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(5);
      expect(res.body.meta).toEqual({
        page: 3,
        limit: 10,
        totalItems: 25,
        totalPages: 3,
        hasNextPage: false,
        hasPrevPage: true,
      });
    });

    it('defaults page to 1 when page=0', async () => {
      const res = await authRequest(token1).get('/api/notes').query({ page: 0, limit: 10 });

      expect(res.status).toBe(200);
      expect(res.body.meta.page).toBe(1);
    });

    it('defaults page to 1 when page is negative', async () => {
      const res = await authRequest(token1).get('/api/notes').query({ page: -5, limit: 10 });

      expect(res.status).toBe(200);
      expect(res.body.meta.page).toBe(1);
    });

    it('caps limit at 100 when limit > 100', async () => {
      const res = await authRequest(token1).get('/api/notes').query({ page: 1, limit: 200 });

      expect(res.status).toBe(200);
      expect(res.body.meta.limit).toBe(100);
      expect(res.body.data.length).toBeLessThanOrEqual(100);
    });

    it('defaults limit to 20 when not provided', async () => {
      const res = await authRequest(token1).get('/api/notes').query({ page: 1 });

      expect(res.status).toBe(200);
      expect(res.body.meta.limit).toBe(20);
    });

    it('returns empty data for page beyond totalPages', async () => {
      const res = await authRequest(token1).get('/api/notes').query({ page: 10, limit: 10 });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
      expect(res.body.meta.page).toBe(10);
      expect(res.body.meta.hasNextPage).toBe(false);
    });
  });

  describe('GET /api/notes - Search', () => {
    it('filters by title containing search term', async () => {
      const res = await authRequest(token1).get('/api/notes').query({ search: 'Note 5' });

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      res.body.data.forEach((note) => {
        expect(note.title.toLowerCase()).toContain('note 5');
      });
    });

    it('filters by content containing search term', async () => {
      const res = await authRequest(token1).get('/api/notes').query({ search: 'Content for note 3' });

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      res.body.data.forEach((note) => {
        expect(note.content.toLowerCase()).toContain('content for note 3');
      });
    });

    it('search is case-insensitive', async () => {
      const res = await authRequest(token1).get('/api/notes').query({ search: 'NOTE 1' });

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      res.body.data.forEach((note) => {
        expect(note.title.toLowerCase()).toContain('note 1');
      });
    });

    it('returns empty array when no matches', async () => {
      const res = await authRequest(token1).get('/api/notes').query({ search: 'nonexistent' });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
      expect(res.body.meta.totalItems).toBe(0);
    });

    it('search works with pagination', async () => {
      const res = await authRequest(token1).get('/api/notes').query({ search: 'Note', page: 1, limit: 5 });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(5);
      expect(res.body.meta.totalItems).toBe(25);
    });
  });

  describe('GET /api/notes - Tag Filtering', () => {
    it('filters by single tag', async () => {
      const res = await authRequest(token1).get('/api/notes').query({ tags: 'work' });

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      res.body.data.forEach((note) => {
        expect(note.tags.some((t) => t.name === 'work')).toBe(true);
      });
    });

    it('filters by multiple tags (OR logic)', async () => {
      const res = await authRequest(token1).get('/api/notes').query({ tags: 'work,personal' });

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      res.body.data.forEach((note) => {
        const tagNames = note.tags.map((t) => t.name);
        expect(tagNames.some((n) => ['work', 'personal'].includes(n))).toBe(true);
      });
    });

    it('returns empty array for non-existent tag', async () => {
      const res = await authRequest(token1).get('/api/notes').query({ tags: 'nonexistent' });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
    });

    it('tag filtering works with pagination', async () => {
      const res = await authRequest(token1).get('/api/notes').query({ tags: 'work', page: 1, limit: 5 });

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeLessThanOrEqual(5);
    });
  });

  describe('GET /api/notes - Archived Filter', () => {
    it('returns only non-archived notes by default', async () => {
      const res = await authRequest(token1).get('/api/notes');

      expect(res.status).toBe(200);
      res.body.data.forEach((note) => {
        expect(note.isArchived).toBe(false);
      });
    });

    it('returns archived notes when archived=true', async () => {
      const res = await authRequest(token1).get('/api/notes').query({ archived: 'true' });

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(5);
      res.body.data.forEach((note) => {
        expect(note.isArchived).toBe(true);
      });
    });

    it('returns non-archived notes when archived=false', async () => {
      const res = await authRequest(token1).get('/api/notes').query({ archived: 'false' });

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(20);
      res.body.data.forEach((note) => {
        expect(note.isArchived).toBe(false);
      });
    });

    it('archived filter works with pagination', async () => {
      const res = await authRequest(token1).get('/api/notes').query({ archived: 'true', page: 1, limit: 2 });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.meta.totalItems).toBe(5);
    });
  });

  describe('GET /api/notes - Sorting', () => {
    it('sorts by createdAt descending by default', async () => {
      const res = await authRequest(token1).get('/api/notes').query({ limit: 5 });

      expect(res.status).toBe(200);
      const dates = res.body.data.map((n) => new Date(n.createdAt).getTime());
      for (let i = 1; i < dates.length; i++) {
        expect(dates[i - 1]).toBeGreaterThanOrEqual(dates[i]);
      }
    });

    it('sorts by createdAt ascending when sortOrder=asc', async () => {
      const res = await authRequest(token1).get('/api/notes').query({ sortBy: 'createdAt', sortOrder: 'asc', limit: 5 });

      expect(res.status).toBe(200);
      const dates = res.body.data.map((n) => new Date(n.createdAt).getTime());
      for (let i = 1; i < dates.length; i++) {
        expect(dates[i - 1]).toBeLessThanOrEqual(dates[i]);
      }
    });

    it('sorts by title ascending', async () => {
      const res = await authRequest(token1).get('/api/notes').query({ sortBy: 'title', sortOrder: 'asc', limit: 5 });

      expect(res.status).toBe(200);
      const titles = res.body.data.map((n) => n.title.toLowerCase());
      for (let i = 1; i < titles.length; i++) {
        expect(titles[i - 1]).toBeLessThanOrEqual(titles[i]);
      }
    });

    it('sorts by title descending', async () => {
      const res = await authRequest(token1).get('/api/notes').query({ sortBy: 'title', sortOrder: 'desc', limit: 5 });

      expect(res.status).toBe(200);
      const titles = res.body.data.map((n) => n.title.toLowerCase());
      for (let i = 1; i < titles.length; i++) {
        expect(titles[i - 1]).toBeGreaterThanOrEqual(titles[i]);
      }
    });

    it('sorting works with search filter', async () => {
      const res = await authRequest(token1).get('/api/notes').query({ search: 'Note', sortBy: 'title', sortOrder: 'asc' });

      expect(res.status).toBe(200);
      const titles = res.body.data.map((n) => n.title.toLowerCase());
      for (let i = 1; i < titles.length; i++) {
        expect(titles[i - 1]).toBeLessThanOrEqual(titles[i]);
      }
    });
  });

  describe('GET /api/notes - Combined Filters', () => {
    it('combines search, tags, archived, and pagination', async () => {
      const res = await authRequest(token1).get('/api/notes').query({
        search: 'Note',
        tags: 'work,personal',
        archived: 'false',
        page: 1,
        limit: 5,
        sortBy: 'title',
        sortOrder: 'asc',
      });

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeLessThanOrEqual(5);
      res.body.data.forEach((note) => {
        expect(note.isArchived).toBe(false);
        const tagNames = note.tags.map((t) => t.name);
        expect(tagNames.some((n) => ['work', 'personal'].includes(n))).toBe(true);
        expect(note.title.toLowerCase()).toContain('note');
      });
    });

    it('combines search and tag filter with OR logic on tags', async () => {
      const res = await authRequest(token1).get('/api/notes').query({
        search: 'Content',
        tags: 'urgent,ideas',
      });

      expect(res.status).toBe(200);
      res.body.data.forEach((note) => {
        expect(note.content.toLowerCase()).toContain('content');
        const tagNames = note.tags.map((t) => t.name);
        expect(tagNames.some((n) => ['urgent', 'ideas'].includes(n))).toBe(true);
      });
    });

    it('returns correct totalItems with combined filters', async () => {
      const res = await authRequest(token1).get('/api/notes').query({
        tags: 'work',
        archived: 'false',
      });

      expect(res.status).toBe(200);
      expect(res.body.meta.totalItems).toBeGreaterThan(0);
      expect(res.body.meta.totalItems).toBeLessThanOrEqual