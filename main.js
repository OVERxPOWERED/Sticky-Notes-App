(function () {
    const createTB = document.getElementById('createTB');
    const delAll = document.getElementById('delAll');
    const textAreaFrame = document.getElementById('textAreaFrame');
    const colorButtons = document.querySelectorAll('.Color');
    const myTBcolor = document.getElementById('myTBcolor');
    const myColor = document.getElementById('myColor');
    const changeBgBtn = document.getElementById('changeBg');
    const deleteArea = document.getElementById('deleteArea');
    const info = document.getElementById('info');

    let infoTimeout = null;

    info.addEventListener('mouseover', () => {
        infoTimeout = setTimeout(() => {
            info.classList.add('active');
        }, 2000);
    });

    info.addEventListener('mouseout', () => {
        clearTimeout(infoTimeout);
        info.classList.remove('active');
    });

    let currentColor = 'rgba(255, 255, 152, 0.5)';
    const defaultColors = ['rgba(165, 255, 165,0.5)', 'rgba(255, 255, 152,0.5)', 'rgba(255, 178, 191,0.5)', 'rgba(153, 255, 255,0.5)'];
    let noteCounter = 0;

    const changeBg = () => {
        if (myColor.value === '') {
            alert('Enter color/image url');
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
            colorButtons.forEach(btn => btn.style.outline = 'none');
            button.style.outline = '2px solid black';
        });
    });

    myTBcolor.addEventListener('input', () => {
        currentColor = myTBcolor.value + '80';
    });

    createTB.addEventListener('click', () => {
        const textBox = document.createElement('textarea');

        textBox.setAttribute('draggable', 'true');

        textBox.classList.add('myTB');
        textBox.setAttribute('placeholder', 'Type your note here...');

        const initialColor = defaultColors[noteCounter % defaultColors.length];
        textBox.style.backgroundColor = initialColor;
        noteCounter++;

        textBox.addEventListener('dragstart', (e) => {
            textBox.classList.add('dragging');
            deleteArea.classList.add('visible'); // Show the delete area
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
                textBox.remove(); 
            }
        });

        textAreaFrame.appendChild(textBox);

        textBox.addEventListener('dblclick', () => {
            textBox.style.backgroundColor = currentColor;
        });

        textBox.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (confirm("Delete this note?")) {
                textBox.remove();
            }
        });
    });

    deleteArea.addEventListener('dragover', e => {
        e.preventDefault(); // This is crucial to allow the 'drop'
        deleteArea.classList.add('active');
    });

    deleteArea.addEventListener('dragleave', () => {
        deleteArea.classList.remove('active');
    });

    // textAreaFrame.addEventListener('dragover', (e) => {
    //     e.preventDefault();

    //     const afterElement = getDragAfterElement(textAreaFrame, e.clientY);
    //     const draggable = document.querySelector('.dragging');

    //     if (afterElement == null) {
    //         textAreaFrame.appendChild(draggable);
    //     } else {
    //         textAreaFrame.insertBefore(draggable, afterElement);
    //     }
    // });

    // function getDragAfterElement(container, y) {
    //     const draggableElements = [...container.querySelectorAll('.myTB:not(.dragging)')];

    //     return draggableElements.reduce((closest, child) => {
    //         const box = child.getBoundingClientRect();
    //         const offset = y - box.top - box.height / 2;
    //         if (offset < 0 && offset > closest.offset) {
    //             return { offset: offset, element: child };
    //         } else {
    //             return closest;
    //         }
    //     }, { offset: Number.NEGATIVE_INFINITY }).element;
    // }


    delAll.addEventListener('click', () => {
        if (confirm("Are you sure you want to delete all notes?")) {
            textAreaFrame.innerHTML = '';
            noteCounter = 0;
        }
    });

})();