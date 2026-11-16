(function () {
    const BASE_URL = '/api/notes';
    let isLoading = false;
    let currentPage = 1;
    let totalPages = 1;
    let currentSearch = '';
    let currentTags = [];
    let allTags = new Set();

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
    const prevPageBtn = document.getElementById('prevPage');
    const nextPageBtn = document.getElementById('nextPage');
    const pageIndicator = document.getElementById('pageIndicator');
    const loadingSkeleton = document.getElementById('loadingSkeleton');
    const emptyState = document.getElementById('emptyState');

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

    const loadNotes = async (params = {}) => {
        try {
            setLoading(true);
            showSkeleton(true);
            showEmptyState(false);

            const queryParams = {
                page: currentPage,
                limit: 12,
                ...params
            };

            if (currentSearch) queryParams.search = currentSearch;
            if (currentTags.length > 0) queryParams.tags = currentTags;

            const queryString = buildQueryString(queryParams);
            const url = `${BASE_URL}${queryString ? `?${queryString}` : ''}`;

            const response = await apiRequest(url);
            const { notes, pagination, tags } = response;

            allTags = new Set(tags);
            renderTags();
            renderNotes(notes);
            updatePagination(pagination);
        } catch (error) {
            showToast(`Failed to load notes: ${error.message}`, 'error');
            renderNotes([]);
            updatePagination({ page: 1, totalPages: 1, total: 0 });
        } finally {
            setLoading(false);
            showSkeleton(false);
        }
    };

    const fetchNotes = () => loadNotes();

    const createNote = async (data) => {
        try {
            setLoading(true);
            const note = await apiRequest(BASE_URL, {
                method: 'POST',
                body: JSON.stringify(data)
            });
            renderNote(note);
            showToast('Note created', 'success');
            return note;
        } catch (error) {
            showToast(`Failed to create note: ${error.message}`, 'error');
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const updateNote = async (id, data) => {
        try {
            setLoading(true);
            const note = await apiRequest(`${BASE_URL}/${id}`, {
                method: 'PUT',
                body: JSON.stringify(data)
            });
            showToast('Note updated', 'success');
            return note;
        } catch (error) {
            showToast(`Failed to update note: ${error.message}`, 'error');
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const deleteNote = async (id) => {
        try {
            setLoading(true);
            await apiRequest(`${BASE_URL}/${id}`, { method: 'DELETE' });
            const noteEl = document.querySelector(`[data-note-id="${id}"]`);
            if (noteEl) noteEl.remove();
            showToast('Note deleted', 'success');
        } catch (error) {
            showToast(`Failed to delete note: ${error.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    const renderNote = (note) => {
        const noteEl = document.createElement('div');
        noteEl.className = 'note';
        noteEl.dataset.noteId = note.id;
        noteEl.style.backgroundColor = note.color || '#fff';

        const tagsHtml = note.tags && note.tags.length > 0
            ? `<div class="note-tags">${note.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}</div>`
            : '';

        noteEl.innerHTML = `
            <div class="note-header">
                <h3 class="note-title">${escapeHtml(note.title || 'Untitled')}</h3>
                <div class="note-actions">
                    <button class="edit-btn" aria-label="Edit note">✏️</button>
                    <button class="delete-btn" aria-label="Delete note">🗑️</button>
                </div>
            </div>
            <div class="note-content">${escapeHtml(note.content || '')}</div>
            ${tagsHtml}
            <div class="note-meta">
                <span class="note-date">${formatDate(note.updatedAt || note.createdAt)}</span>
            </div>
        `;

        noteEl.querySelector('.edit-btn').addEventListener('click', () => openEditModal(note));
        noteEl.querySelector('.delete-btn').addEventListener('click', () => {
            if (confirm('Delete this note?')) deleteNote(note.id);
        });

        notesAreaFrame.appendChild(noteEl);
    };

    const renderNotes = (notes) => {
        notesAreaFrame.innerHTML = '';
        if (notes.length === 0) {
            showEmptyState(true, currentSearch || currentTags.length > 0
                ? 'No notes match your search'
                : 'No notes yet. Create your first note!');
        } else {
            showEmptyState(false);
            notes.forEach(note => renderNote(note));
        }
    };

    const renderTags = () => {
        if (!tagFilter) return;
        const selectedValues = Array.from(tagFilter.selectedOptions).map(o => o.value);
        tagFilter.innerHTML = '';
        allTags.forEach(tag => {
            const option = document.createElement('option');
            option.value = tag;
            option.textContent = tag;
            option.selected = selectedValues.includes(tag);
            tagFilter.appendChild(option);
        });
    };

    const updatePagination = (pagination) => {
        currentPage = pagination.page || 1;
        totalPages = pagination.totalPages || 1;

        if (pageIndicator) {
            pageIndicator.textContent = `Page ${currentPage} of ${totalPages} (${pagination.total || 0} notes)`;
        }
        if (prevPageBtn) {
            prevPageBtn.disabled = currentPage <= 1 || isLoading;
        }
        if (nextPageBtn) {
            nextPageBtn.disabled = currentPage >= totalPages || isLoading;
        }
    };

    const escapeHtml = (text) => {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString(undefined, {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    const debounce = (fn, delay) => {
        let timeoutId;
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => fn(...args), delay);
        };
    };

    const handleSearch = debounce((e) => {
        currentSearch = e.target.value.trim();
        currentPage = 1;
        loadNotes();
    }, 300);

    const handleTagFilter = (e) => {
        currentTags = Array.from(e.target.selectedOptions).map(o => o.value);
        currentPage = 1;
        loadNotes();
    };

    const handlePrevPage = () => {
        if (currentPage > 1 && !isLoading) {
            currentPage--;
            loadNotes();
        }
    };

    const handleNextPage = () => {
        if (currentPage < totalPages && !isLoading) {
            currentPage++;
            loadNotes();
        }
    };

    const openEditModal = (note) => {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal">
                <h2>Edit Note</h2>
                <input type="text" id="editTitle" value="${escapeHtml(note.title || '')}" placeholder="Title" />
                <textarea id="editContent" placeholder="Content">${escapeHtml(note.content || '')}</textarea>
                <div class="modal-tags">
                    <label>Tags (comma separated):</label>
                    <input type="text" id="editTags" value="${(note.tags || []).join(', ')}" />
                </div>
                <div class="modal-colors">
                    ${['#fff', '#fef9c3', '#fecaca', '#bbf7d0', '#bfdbfe', '#e9d5ff', '#fbcfe8'].map(c =>
                        `<button class="color-pick${note.color === c ? ' selected' : ''}" style="background:${c}" data-color="${c}"></button>`
                    ).join('')}
                </div>
                <div class="modal-actions">
                    <button id="saveEdit">Save</button>
                    <button id="cancelEdit">Cancel</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        const selectedColor = { value: note.color || '#fff' };
        modal.querySelectorAll('.color-pick').forEach(btn => {
            btn.addEventListener('click', () => {
                modal.querySelectorAll('.color-pick').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                selectedColor.value = btn.dataset.color;
            });
        });

        modal.querySelector('#saveEdit').addEventListener('click', async () => {
            const title = modal.querySelector('#editTitle').value.trim();
            const content = modal.querySelector('#editContent').value.trim();
            const tags = modal.querySelector('#editTags').value.split(',').map(t => t.trim()).filter(Boolean);
            if (!title && !content) return showToast('Title or content required', 'error');
            await updateNote(note.id, { title, content, tags, color: selectedColor.value });
            modal.remove();
            loadNotes();
        });

        modal.querySelector('#cancelEdit').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    };

    const initEventListeners = () => {
        if (searchInput) searchInput.addEventListener('input', handleSearch);
        if (tagFilter) tagFilter.addEventListener('change', handleTagFilter);
        if (prevPageBtn) prevPageBtn.addEventListener('click', handlePrevPage);
        if (nextPageBtn) nextPageBtn.addEventListener('click', handleNextPage);

        createTB.addEventListener('click', () => openEditModal({ id: null, title: '', content: '', tags: [], color: '#fff' }));
        delAll.addEventListener('click', async () => {
            if (confirm('Delete ALL notes? This cannot be undone.')) {
                try {
                    setLoading(true);
                    await apiRequest(BASE_URL, { method: 'DELETE' });
                    notesAreaFrame.innerHTML = '';
                    showToast('All notes deleted', 'success');
                    loadNotes();
                } catch (error) {
                    showToast(`Failed to delete all: ${error.message}`, 'error');
                } finally {
                    setLoading(false);
                }
            }
        });

        colorButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                myTBcolor.value = btn.dataset.color;
                myColor.value = btn.dataset.color;
            });
        });
    };

    document.addEventListener('DOMContentLoaded', () => {
        initEventListeners();
        loadNotes();
    });

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { loadNotes, createNote, updateNote, deleteNote };
    }
})();