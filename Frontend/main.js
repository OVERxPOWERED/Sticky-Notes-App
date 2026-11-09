(function () {
    const BASE_URL = '/api/notes';
    let isLoading = false;

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

    const fetchNotes = async () => {
        try {
            setLoading(true);
            const notes = await apiRequest(BASE_URL);
            notesAreaFrame.innerHTML = '';
            notes.forEach(note => renderNote(note));
            showToast(`Loaded ${notes.length} notes`, 'success');
        } catch (error) {
            showToast(`Failed to load notes: ${error.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

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
            showToast('Note deleted', 'success');
        } catch (error) {
            showToast(`Failed to delete note: ${error.message}`, 'error');
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const deleteAllNotes = async () => {
        if (!confirm('Delete all notes? This cannot be undone.')) return;
        try {
            setLoading(true);
            const notes = await apiRequest(BASE_URL);
            await Promise.all(notes.map(note => deleteNote(note._id)));
            notesAreaFrame.innerHTML = '';
            showToast('All notes deleted', 'success');
        } catch (error) {
            showToast(`Failed to delete all notes: ${error.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    const renderNote = (note) => {
        const textBox = document.createElement('textarea');
        textBox.dataset.id = note._id;
        textBox.setAttribute('draggable', 'true');
        textBox.classList.add('myTB');
        textBox.value = note.content || '';
        textBox.style.backgroundColor = note.color || 'rgba(165, 255, 165,0.7)';
        textBox.setAttribute('placeholder', 'Type your note here...');

        let updateTimeout;
        textBox.addEventListener('input', () => {
            clearTimeout(updateTimeout);
            updateTimeout = setTimeout(() => {
                updateNote(note._id, { content: textBox.value, color: textBox.style.backgroundColor });
            }, 500);
        });

        textBox.addEventListener('dragstart', (e) => {
            textBox.classList.add('dragging');
            deleteArea.classList.add('visible');
            e.dataTransfer.setData('text/plain', note._id);
        });

        textBox.addEventListener('dragend', (e) => {
            textBox.classList.remove('dragging');
            deleteArea.classList.remove('visible');
            deleteArea.classList.remove('active');

            const deleteRect = deleteArea.getBoundingClientRect();
            if (
                e.clientX >= deleteRect.left &&
                e.clientX <= deleteRect.right &&
                e.clientY >= deleteRect.top &&
                e.clientY <= deleteRect.bottom
            ) {
                deleteNote(note._id).then(() => textBox.remove());
            }
        });

        textBox.addEventListener('dblclick', () => {
            textBox.style.backgroundColor = currentColor;
            updateNote(note._id, { color: currentColor });
        });

        textBox.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (confirm("Delete this note?")) {
                deleteNote(note._id).then(() => textBox.remove());
            }
        });

        notesAreaFrame.appendChild(textBox);
    };

    menuBtn.addEventListener('click', () => {
        myColorBox.classList.toggle('slide');
        buttonPanel.classList.toggle('slide');
    });

    let currentColor = 'rgba(165, 255, 165,0.7)';
    let colorIndex = 0;
    const defaultColors = ['rgba(165, 255, 165,0.7)', 'rgba(255, 255, 152,0.7)', 'rgba(255, 178, 191,0.7)', 'rgba(153, 255, 255,0.7)'];

    const changeBg = () => {
        if (myColor.value === '') {
            showToast('Enter color/image url', 'error');
            document.body.style.backgroundImage = `url("Exp6Background.jpg")`;
            return;
        }
        document.body.style.backgroundImage = `url(${myColor.value})`;
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundPosition = 'center';
        document.body.style.backgroundColor = myColor.value;
        myColor.value = '';
    };

    changeBgBtn.addEventListener('click', changeBg);

    colorButtons.forEach((button, index) => {
        button.addEventListener('click', () => {
            currentColor = defaultColors[index];
            colorIndex = index;
            colorButtons.forEach(btn => btn.style.outline = 'none');
            button.style.outline = '2px solid black';
        });
    });

    myTBcolor.addEventListener('input', () => {
        currentColor = myTBcolor.value + '80';
    });

    createTB.addEventListener('click', () => {
        createNote({
            title: 'Untitled',
            content: '',
            color: currentColor
        }).catch(() => {});
    });

    delAll.addEventListener('click', deleteAllNotes);

    deleteArea.addEventListener('dragover', e => {
        e.preventDefault();
        deleteArea.classList.add('active');
    });

    deleteArea.addEventListener('dragleave', () => {
        deleteArea.classList.remove('active');
    });

    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes slideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }
        .dragging { opacity: 0.5; cursor: grabbing; }
        #deleteArea.visible { opacity: 1; pointer-events: auto; }
        #deleteArea.active { background: rgba(231, 76, 60, 0.3); border-color: #e74c3c; }
    `;
    document.head.appendChild(style);

    fetchNotes();
})();