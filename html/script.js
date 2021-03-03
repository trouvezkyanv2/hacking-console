const charsByLine = 74;
const letterSpeed = 5;
const blinker = '<span class="blink">_</span><br><br><br>';

var contentBox = document.getElementById('console-content');
var contentContainerBox = document.getElementById('console-content-container');
var inputBox = document.getElementById('console-input');
var inputField = document.getElementById('console-input-field');
var inputInfosBox = document.getElementById('console-infos');

var letterTimer;
var currentOffset = 0;
var log = '';
var pwd = '';
var token = 'start';


sendInput('start');

document.body.onkeydown = function(e) {
    inputField.focus();
    // Return
    if(e.keyCode == 13) {
        if(inputBox.style.display != 'none') {
            sendInput(inputField.value);
        }
    }
    // Up and down
    if(e.keyCode == 40) setOffset(currentOffset - 20);
    if(e.keyCode == 38) setOffset(currentOffset + 20);
    // Escape
    if(e.keyCode == 27) sendInput('home');
};

function sendInput(val) {
    clearPage();
    if(token == 'login-log') log = val;
    if(token == 'login-pwd') pwd = val;
    var request = new XMLHttpRequest();
    // Post event
    request.open("POST", '/console-api', true);
    request.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    request.onreadystatechange = function() {
        if (this.readyState === XMLHttpRequest.DONE && this.status === 200) {
            if(request.response != null) {
                var data = JSON.parse(request.response);
                displayPage(data);
                if(data.file) setTimeout(() => displayFile(data.file), 1500);
            }
        }
    }
    request.send(JSON.stringify({ input: val, log: log, pwd: pwd, token: token}));
}

function displayFile(url) {
    window.open(url, '_blank');
    win.focus();
}

function displayPage(pageObject) {
    token = pageObject.token;
    displayContent(pageObject.content);
}

function clearPage() {
    if(letterTimer != null) clearTimeout(letterTimer);
    inputBox.style.display = 'none';
    inputInfosBox.style.display = 'none';
    contentBox.innerHTML = '';
    inputField.value = '';
}

function getMaxOffset() {
    var maxOffset = contentBox.offsetHeight - contentContainerBox.offsetHeight;
    maxOffset = -maxOffset;
    if(maxOffset > 0) maxOffset = 0;
    return maxOffset;
}

function setOffset(offset) {
    currentOffset = offset;
    if(currentOffset > 0) currentOffset = 0;
    if(currentOffset < getMaxOffset()) currentOffset = getMaxOffset();
    contentBox.style.marginTop = currentOffset + "px";
}

function displayContent(message) {
    clearPage();
    if(message == null) return 0;
    var i = 0;
    var content = '';
    var colCount = 0;
    var space = false;
    var addLetter = () => {
        if(i >= message.length) return 0;
        var wait = letterSpeed;
        if(message.substring(i, i + 6) == '[CYAN]') {
            content += '<i class="cyan">'
            i += 6;
        } else if(message.substring(i, i + 8) == '[ORANGE]') {
            content += '<i class="orange">'
            i += 8;
        } else if(message.substring(i, i + 5) == '[RED]') {
            content += '<i class="red">'
            i += 5;
        } else if(message.substring(i, i + 8) == '[YELLOW]') {
            content += '<i class="yellow">'
            i += 8;
        }  else if(message.substring(i, i + 6) == '[BLUE]') {
            content += '<i class="blue">'
            i += 6;
        }  else if(message.substring(i, i + 3) == '[/]') {
            content += '</i>'
            i += 3;
        } else if(message.substring(i, i + 9).startsWith('[WAIT')) {
            wait = parseInt(message.substring(i + 5, i + 8)) * 100;
            i += 9;
        } else {
            var char = message.charAt(i);
            if(space && char != ' ') space = false;

            if((char == '\n') && i < (message.length - 1)) {
                content += '<br>';
                colCount = 0;
            } else if(char == ' ' && colCount < (charsByLine - 1) && colCount > 0) {
                content += space ? '&nbsp;' : ' ';
                space = true;
            } else if(char == '<') {
                content += '&lt;';
            } else if(char == '>') {
                content += '&gt;';
            } else {
                content += char;
            }
            i++;
            colCount++;
        }
        contentBox.innerHTML = content + blinker;
        setOffset(getMaxOffset());
        return wait;
    };

    var displayLoop = () => {
        var nextWait = letterSpeed;
        for (let j = 0; (j < 5 && nextWait == letterSpeed); j++) {
            nextWait = addLetter();
        }
        if(i < message.length) {
            letterTimer = setTimeout(displayLoop, nextWait);
        } else {
            clearTimeout(letterTimer);
            if(contentBox.offsetHeight > contentContainerBox.offsetHeight) {   
                inputInfosBox.style.display = 'block';
            }
            contentBox.innerHTML = content + blinker;
            setOffset(getMaxOffset());
            inputBox.style.display = 'block';
            inputField.value = '';
            inputField.focus();
        }
    };

    letterTimer = setTimeout(displayLoop, letterSpeed);
}