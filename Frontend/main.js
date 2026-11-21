(function () {
    const BASE_URL = '/api/notes';
    let isLoading = false;
    let currentPage = 1;
    let totalPages = 1;
    let currentSearch = '';
    let currentCategoryFilter = 'all';
    let currentTagFilters = new Set();
    let allTags = new Set();
    let allNotes = [];
    let editingNoteId = null;

    const CATEGORIES = [
        { id: 'personal', label: 'Personal', color: '#e74c3c' },
        { id: 'work', label: 'Work', color: '#3498db' },
        { id: 'study', label: 'Study', color: '#27ae60' },
        { id: 'ideas', label: 'Ideas', color: '#f39c12' },
        { id: 'other', label: 'Other', color: '#9b59b6' }
    ];

    const MAX_TAGS = 10;
    const MAX_TAG_LENGTH = 20;

    const createTB = document.getElementById('createTB');
    const delAll = document.getElementById('delAll');
    const notesAreaFrame = document.getElementById('notesAreaFrame');
    const colorButtons = document.querySelectorAll('.Color');
    const myTBcolor = document.getElementById('myTBcolor');
    const myColor = document.getElementById('myColor');
    const changeBgBtn = document.getElementById('changeBg');
    const deleteArea = document.getElementById('deleteArea');
    const menuBtn = document.getElementById('menuBtn');
    const myColorBox = document.getElementById('myColorBox');
    const buttonPanel = document.getElementById('buttonPanel');

    const searchInput = document.getElementById('searchInput');
    const tagFilter = document.getElementById('tagFilter');
    const categoryFilter = document.getElementById('categoryFilter');
    const prevPageBtn = document.getElementById('prevPage');
    const nextPageBtn = document.getElementById('nextPage');
    const pageIndicator = document.getElementById('pageIndicator');
    const loadingSkeleton = document.getElementById('loadingSkeleton');
    const emptyState = document.getElementById('emptyState');

    const noteModal = document.getElementById('noteModal');
    const noteModalTitle = document.getElementById('noteModalTitle');
    const noteContent = document.getElementById('noteContent');
    const noteCategory = document.getElementById('noteCategory');
    const noteTags = document.getElementById('noteTags');
    const tagValidation = document.getElementById('tagValidation');
    const noteColor = document.getElementById('noteColor');
    const saveNoteBtn = document.getElementById('saveNoteBtn');
    const cancelNoteBtn = document.getElementById('cancelNoteBtn');
    const closeModalBtn = document.getElementById('closeModalBtn');

    const showToast = (message, type = 'info') => {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed; bottom: 20px; right: 20px; padding: 12px 20px;
            border-radius: 4px; color: white; z-index: 10000; animation: slideIn 0.3s ease;
            background: ${type === 'error' ? '#e74c3c' : type === 'success' ? '#27ae60' : '#3498db'};
        `;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    };

    const setLoading = (loading) => {
        isLoading = loading;
        document.body.style.cursor = loading ? 'wait' : 'default';
        createTB.disabled = loading;
        delAll.disabled = loading;
        colorButtons.forEach(btn => btn.disabled = loading);
        if (prevPageBtn) prevPageBtn.disabled = loading;
        if (nextPageBtn) nextPageBtn.disabled = loading;
        if (searchInput) searchInput.disabled = loading;
        if (tagFilter) tagFilter.disabled = loading;
        if (categoryFilter) categoryFilter.disabled = loading;
        if (saveNoteBtn) saveNoteBtn.disabled = loading;
    };

    const showSkeleton = (show) => {
        if (loadingSkeleton) {
            loadingSkeleton.style.display = show ? 'flex' : 'none';
        }
        if (notesAreaFrame) {
            notesAreaFrame.style.display = show ? 'none' : 'flex';
        }
    };

    const showEmptyState = (show, message = 'No notes found') => {
        if (emptyState) {
            emptyState.textContent = message;
            emptyState.style.display = show ? 'block' : 'none';
        }
    };

    const apiRequest = async (url, options = {}) => {
        const response = await fetch(url, {
            headers: { 'Content-Type': 'application/json', ...options.headers },
            ...options
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Request failed' }));
            throw new Error(error.message || `HTTP ${response.status}`);
        }
        return response.json();
    };

    const buildQueryString = (params) => {
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                if (Array.isArray(value)) {
                    value.forEach(v => searchParams.append(key, v));
                } else {
                    searchParams.set(key, value);
                }
            }
        });
        return searchParams.toString();
    };

    const loadNotes = async () => {
        if (isLoading) return;
        setLoading(true);
        showSkeleton(true);
        showEmptyState(false);

        try {
            const params = {
                page: currentPage,
                limit: 12,
                search: currentSearch || undefined,
                category: currentCategoryFilter !== 'all' ? currentCategoryFilter : undefined,
                tags: currentTagFilters.size > 0 ? Array.from(currentTagFilters) : undefined
            };
            const queryString = buildQueryString(params);
            const data = await apiRequest(`${BASE_URL}?${queryString}`);
            
            allNotes = data.notes || [];
            totalPages = data.totalPages || 1;
            currentPage = data.page || 1;
            
            allTags.clear();
            allNotes.forEach(note => {
                (note.tags || []).forEach(tag => allTags.add(tag));
            });
            
            updateTagFilterOptions();
            updateCategoryFilterOptions();
            renderNotes();
            updatePagination();
        } catch (error) {
            showToast(error.message, 'error');
            showEmptyState(true, 'Failed to load notes');
        } finally {
            setLoading(false);
            showSkeleton(false);
        }
    };

    const updateTagFilterOptions = () => {
        if (!tagFilter) return;
        const currentValues = Array.from(tagFilter.selectedOptions).map(o => o.value);
        tagFilter.innerHTML = '<option value="">All Tags</option>';
        Array.from(allTags).sort().forEach(tag => {
            const option = document.createElement('option');
            option.value = tag;
            option.textContent = tag;
            if (currentValues.includes(tag)) option.selected = true;
            tagFilter.appendChild(option);
        });
    };

    const updateCategoryFilterOptions = () => {
        if (!categoryFilter) return;
        const currentValue = categoryFilter.value;
        categoryFilter.innerHTML = '<option value="all">All Categories</option>';
        CATEGORIES.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.id;
            option.textContent = cat.label;
            categoryFilter.appendChild(option);
        });
        categoryFilter.value = currentValue;
    };

    const renderNotes = () => {
        if (!notesAreaFrame) return;
        
        let filteredNotes = allNotes;
        
        if (currentSearch) {
            const searchLower = currentSearch.toLowerCase();
            filteredNotes = filteredNotes.filter(note => 
                note.content.toLowerCase().includes(searchLower) ||
                (note.tags || []).some(tag => tag.toLowerCase().includes(searchLower)) ||
                (note.category && note.category.toLowerCase().includes(searchLower))
            );
        }
        
        if (currentCategoryFilter !== 'all') {
            filteredNotes = filteredNotes.filter(note => note.category === currentCategoryFilter);
        }
        
        if (currentTagFilters.size > 0) {
            filteredNotes = filteredNotes.filter(note => 
                (note.tags || []).some(tag => currentTagFilters.has(tag))
            );
        }

        if (filteredNotes.length === 0) {
            notesAreaFrame.innerHTML = '';
            showEmptyState(true, currentSearch || currentCategoryFilter !== 'all' || currentTagFilters.size > 0 
                ? 'No notes match your filters' 
                : 'No notes yet. Create your first note!');
            return;
        }

        showEmptyState(false);
        notesAreaFrame.innerHTML = filteredNotes.map(note => createNoteCard(note)).join('');
        attachNoteCardEvents();
    };

    const createNoteCard = (note) => {
        const category = CATEGORIES.find(c => c.id === note.category) || CATEGORIES[4];
        const tags = (note.tags || []).slice(0, 5);
        const hasMoreTags = (note.tags || []).length > 5;
        const createdDate = new Date(note.createdAt).toLocaleDateString();
        const updatedDate = new Date(note.updatedAt).toLocaleDateString();
        
        return `
            <article class="note-card" data-id="${note.id}" style="border-left-color: ${note.color || category.color}">
                <div class="note-header">
                    <span class="category-badge" style="background: ${category.color}">${category.label}</span>
                    <div class="note-actions">
                        <button class="btn-icon edit-note" aria-label="Edit note" title="Edit">✏️</button>
                        <button class="btn-icon delete-note" aria-label="Delete note" title="Delete">🗑️</button>
                    </div>
                </div>
                <div class="note-content">${escapeHtml(note.content)}</div>
                ${tags.length > 0 ? `
                    <div class="note-tags">
                        ${tags.map(tag => `<span class="tag-pill">${escapeHtml(tag)}</span>`).join('')}
                        ${hasMoreTags ? `<span class="tag-pill tag-more">+${(note.tags || []).length - 5}</span>` : ''}
                    </div>
                ` : ''}
                <div class="note-footer">
                    <span class="note-date">Created: ${createdDate}</span>
                    ${updatedDate !== createdDate ? `<span class="note-date">Updated: ${updatedDate}</span>` : ''}
                </div>
            </article>
        `;
    };

    const escapeHtml = (text) => {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    };

    const attachNoteCardEvents = () => {
        document.querySelectorAll('.edit-note').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const card = e.target.closest('.note-card');
                openEditModal(card.dataset.id);
            });
        });
        
        document.querySelectorAll('.delete-note').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const card = e.target.closest('.note-card');
                deleteNote(card.dataset.id);
            });
        });
    };

    const openCreateModal = () => {
        editingNoteId = null;
        noteModalTitle.textContent = 'Create Note';
        noteContent.value = '';
        noteCategory.value = 'personal';
        noteTags.value = '';
        noteColor.value = '#3498db';
        updateTagValidation('');
        noteModal.style.display = 'flex';
        noteContent.focus();
        document.body.style.overflow = 'hidden';
    };

    const openEditModal = async (noteId) => {
        try {
            const note = await apiRequest(`${BASE_URL}/${noteId}`);
            editingNoteId = noteId;
            noteModalTitle.textContent = 'Edit Note';
            noteContent.value = note.content;
            noteCategory.value = note.category || 'personal';
            noteTags.value = (note.tags || []).join(', ');
            noteColor.value = note.color || '#3498db';
            updateTagValidation(noteTags.value);
            noteModal.style.display = 'flex';
            noteContent.focus();
            document.body.style.overflow = 'hidden';
        } catch (error) {
            showToast(error.message, 'error');
        }
    };

    const closeModal = () => {
        noteModal.style.display = 'none';
        document.body.style.overflow = '';
        editingNoteId = null;
    };

    const updateTagValidation = (value) => {
        if (!tagValidation) return;
        const tags = parseTags(value);
        const errors = [];
        
        if (tags.length > MAX_TAGS) {
            errors.push(`Maximum ${MAX_TAGS} tags allowed`);
        }
        
        const longTags = tags.filter(t => t.length > MAX_TAG_LENGTH);
        if (longTags.length > 0) {
            errors.push(`Tags must be ${MAX_TAG_LENGTH} characters or less`);
        }
        
        const duplicates = tags.filter((tag, index) => tags.indexOf(tag) !== index);
        if (duplicates.length > 0) {
            errors.push('Duplicate tags are not allowed');
        }
        
        if (errors.length > 0) {
            tagValidation.textContent = errors.join('; ');
            tagValidation.className = 'validation-error';
            noteTags.classList.add('invalid');
        } else {
            tagValidation.textContent = `${tags.length}/${MAX_TAGS} tags`;
            tagValidation.className = 'validation-info';
            noteTags.classList.remove('invalid');
        }
    };

    const parseTags = (value) => {
        return value
            .split(',')
            .map(tag => tag.trim())
            .filter(tag => tag.length > 0);
    };

    const validateTags = (value) => {
        const tags = parseTags(value);
        if (tags.length > MAX_TAGS) return false;
        if (tags.some(tag => tag.length > MAX_TAG_LENGTH)) return false;
        const uniqueTags = new Set(tags);
        return uniqueTags.size === tags.length;
    };

    const saveNote = async () => {
        const content = noteContent.value.trim();
        if (!content) {
            showToast('Note content cannot be empty', 'error');
            noteContent.focus();
            return;
        }

        const tagsValue = noteTags.value.trim();
        if (!validateTags(tagsValue)) {
            showToast('Please fix tag validation errors', 'error');
            return;
        }

        const tags = parseTags(tagsValue);
        const category = noteCategory.value;
        const color = noteColor.value;

        setLoading(true);
        try {
            if (editingNoteId) {
                await apiRequest(`${BASE_URL}/${editingNoteId}`, {
                    method: 'PUT',
                    body: JSON.stringify({ content, category, tags, color })
                });
                showToast('Note updated successfully', 'success');
            } else {
                await apiRequest(BASE_URL, {
                    method: 'POST',
                    body: JSON.stringify({ content, category, tags, color })
                });
                showToast('Note created successfully', 'success');
            }
            closeModal();
            await loadNotes();
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const deleteNote = async (noteId) => {
        if (!confirm('Are you sure you want to delete this note?')) return;
        
        setLoading(true);
        try {
            await apiRequest(`${BASE_URL}/${noteId}`, { method: 'DELETE' });
            showToast('Note deleted', 'success');
            await loadNotes();
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const deleteAllNotes = async () => {
        if (!confirm('Are you sure you want to delete ALL notes? This cannot be undone.')) return;
        
        setLoading(true);
        try {
            await apiRequest(BASE_URL, { method: 'DELETE' });
            showToast('All notes deleted', 'success');
            await loadNotes();
        } catch (error) {
            showToast(error.message, 'error');