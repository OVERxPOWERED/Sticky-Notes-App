const createTB = document.getElementById('createTB');
const delAll = document.getElementById('delAll');
const textAreaFrame = document.getElementById('textAreaFrame');
// const buttonPanel = document.getElementById('buttonPanel');
const tbColors = document.getElementsByClassName('Color');
const myTBcolor = document.getElementById('myTBcolor');
const deleteArea = document.getElementById('deleteArea');
const myColor = document.getElementById('myColor');

let changeBg = () => {

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

var currentColor = 'white';
var Color = ['rgba(255,255,255,0)', 'rgba(165, 255, 165,0.5)', 'rgba(255, 255, 152,0.5)', 'rgba(255, 178, 191,0.5)', 'rgba(153, 255, 255,0.5)']

let changeTBcolor = (index) => {
    currentColor = Color[index];
    for (let x of tbColors) {
        x.style.outline = 'none';
    }
    tbColors[index - 1].style.outline = '2px solid black';
};
myTBcolor.addEventListener('input', () => {
    currentColor = myTBcolor.value + '80';
});

let i = 1;
// let c = 0;
// let mLeft = 0;
// let mTop = 0;
let tbIds = [];
createTB.addEventListener('click', () => {
    let TextBox = document.createElement('textarea');
    TextBox.style.position = 'absolute';
    TextBox.setAttribute('cols', '30');
    TextBox.setAttribute('rows', '10');
    TextBox.setAttribute('id', ('TB' + i++));
    tbIds.push(TextBox.id);
    TextBox.setAttribute('class', 'myTB');
    TextBox.setAttribute('placeholder', 'Add Tasks.' + '\n' + 'Double click to change to selected color.' + '\n' + 'Triple click to delete.')
    textAreaFrame.appendChild(TextBox);
    TextBox.style.backgroundImage = 'url("Exp6Background.jpg")';
    TextBox.style.backgroundPosition = 'center';
    TextBox.style.borderImage = `fill 1 linear-gradient(${Color[c + 1]},${Color[c + 1]})`;
    // c = (c + 1) % 4;
    // TextBox.style.top = mTop + 'px';
    // TextBox.style.left = mLeft + 'px';
    // if (mLeft <= (document.body.offsetWidth - 482)) {
    //     mLeft += 241;
    // }
    // else {
    //     mLeft = 0;
    //     mTop += 165;
    // }

    TextBox.addEventListener('dblclick', () => {
        TextBox.style.borderImage = `fill 1 linear-gradient(${currentColor},${currentColor})`;
        currentColor = 'rgba(255,255,255,0)';
    });

    TextBox.addEventListener('mousedown', MouseDown);

    function MouseDown(e) {
        const rect = TextBox.getBoundingClientRect();
        const isOnResizeHandle = e.clientX > rect.right - 15 && e.clientY > rect.bottom - 15;

        if (!isOnResizeHandle) {
            TextBox.addEventListener('mousemove', MouseMove);
        }
    }
    function MouseMove({ movementX, movementY }) {
        let Left = parseInt(window.getComputedStyle(TextBox).left, 10);
        let Top = parseInt(window.getComputedStyle(TextBox).top, 10);

        TextBox.style.left = `${Left + movementX}px`;
        TextBox.style.top = `${Top + movementY}px`;
        if (((Top + movementY) >= (document.body.offsetHeight - 170)) && ((Left + movementX) >= (document.body.offsetWidth - 170))) {
            deleteArea.style.height = '200px';
            deleteArea.style.width = '200px';
            deleteArea.style.top = 'calc(100vh - 220px)';
            deleteArea.style.left = 'calc(100vw - 220px)';
        }
        // else{
        //     deleteArea.style.height='150px';
        //     deleteArea.style.width='150px';
        // }
    }
    document.addEventListener('mouseup', () => {
        TextBox.removeEventListener('mousemove', MouseMove);
        let currTop = parseInt(window.getComputedStyle(TextBox).top, 10);
        let currLeft = parseInt(window.getComputedStyle(TextBox).left, 10);

        if (((currTop) >= (document.body.offsetHeight - 170)) && ((currLeft) >= (document.body.offsetWidth - 170))) {
            document.body.removeChild(TextBox);
            deleteArea.style.height = '150px';
            deleteArea.style.width = '150px';
            deleteArea.style.top = 'calc(100vh - 170px)';
            deleteArea.style.left = 'calc(100vw - 170px)';
        }
    });


    let clickCount = 0;
    TextBox.addEventListener('click', () => {
        clickCount++;

        if (clickCount === 1) {
            clickTimer = setTimeout(() => { clickCount = 0 }, 400);
        }
        else if (clickCount === 3) {
            clearTimeout(clickTimer);
            clickCount = 0;
            document.body.removeChild(TextBox);
        }
    })
});

delAll.addEventListener('click', () => {
    for (let x of tbIds) {
        document.getElementById(x).remove();
    }
    tbIds = [];
    mLeft = 0;
    mTop = 0;
    i = 1;
});