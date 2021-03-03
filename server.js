const fs = require('fs');
const path = require('path');
const express = require('express');
const url = require('url');
const bodyParser = require('body-parser');
const { send, env } = require('process');
const app = express();
const port = 80;

var requireLogin = true;
var testing = false;
const login = 'D3LT4_CRASH';
const password = 'voxpopuli';
const orangepassword = 'HsT$r@TlkXL21e!i8VupwxBh272-OjehlhY';

const pagesDirectory = './pages/';
const charsByLine = 74;

var pages = [];

/* STARTS SERVER --------> */ init();

function init() {
    testing = process.argv.includes('--testing');
    requireLogin = !testing;

    loadPages();

    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));
    app.post('/console-api', handleLogin, handleImageRequest, sendPage);
    app.use(express.static('html'));
    app.use(express.static('files'));

    app.listen(port, () => {
        console.log(`Server listening on port ${port}...`);
    });
}

function handleLogin(req, res, next) {
    if(!requireLogin) {
        next();
        return;
    }

    const log = req.body.log;
    const pwd = req.body.pwd;
    const token = req.body.token;
    
    if(log != login) {
        if(token != 'login-log') sendContent(res, getPageFileContent('login-first'), 'login-log');
        else sendContent(res, getPageFileContent('login'), 'login-log');
    } else if(pwd != password) {
        if(token == 'login-log') sendContent(res, getPageFileContent('password-first'), 'login-pwd');
        else sendContent(res, getPageFileContent('password'), 'login-pwd');
    } else if(pwd == password && token == 'login-pwd') {
        sendContent(res, getPageFileContent('password-validation') + getPageFileContent('home'), 'home');
    } else {
        next();
    }
}

function handleImageRequest(req, res, next) {
    const input = getRawInput(req);
    const token = getToken(req);
    
    if(input == orangepassword && (token == 'orangerequest' || token == 'orangewrong')) {
        res.json({
            file: 'img_VF968pNmS98jczansN6G_orange.png',
            content: getPageFileContent('orangefile'),
            token: 'orange'
        });
        return;
    }
    next();
}

function sendPage(req, res) {
    let input = getInput(req);
    if(input == '') input = 'exit';
    let token = getToken(req);

    let content = getPageFileContent('404').replace('XXX', getRawInput(req)) + getPageFileContent('basichelp');
    let nextToken = '404';

    if(input.startsWith('open ')) {
        content = getPageFileContent('404file').replace('XXX', input.slice(5)) + getPageFileContent('basichelp');
    }

    const page = getPage(input, token);

    if(page) {
        content = page.content;
        nextToken = page.fileName;
        if(page.isFile) {
            content = getFileHeader(page.title) + content + fileFooter;
        }
    }

    sendContent(res, content, nextToken);
}

function getInput(req) {
    let input = req.body.input ? req.body.input.toLowerCase().trim() : '';
    if(input.endsWith(' ?')) input = input.slice(0, -2) + '?';
    if(input.endsWith(' !')) input = input.slice(0, -2) + '!';
    if(input.endsWith('.')) {
        input = input.slice(0, -1);
        input = input.trim();
    }
    return input;
}

function getRawInput(req) {
    return req.body.input ? req.body.input : '';
}

function getToken(req) {
    return req.body.token ? req.body.token : '';
}

function loadPages() {
    pages = [];
    loadDirectory(pagesDirectory);
}

function loadDirectory(dir) {
    fs.readdir(dir, (err, files) => {
        files.forEach(file => {
            if (fs.statSync(dir + file).isDirectory()) {
                loadDirectory(dir + file + '/');
            } else {
                fs.readFile(dir + file, "utf8", (err, data) => {
                    if(data != null) addPage(file, data);
                });
            }
        });
    });
}

function getPageByFileName(fileName) {
    for (let i = 0; i < pages.length; i++) {
        if(pages[i].fileName == fileName) {
            return pages[i];
        }
    }
}

function getPageFileContent(fileName) {
    var page = getPageByFileName(fileName);
    if(page) return page.content;
}

function getPage(input, token) {

    let candidates = pages.filter((p) => (isPageCommand(p, input) && isPageFromToken(p.from, token)));
    if(candidates.length === 0) return;

    candidates.sort((a, b) => {
        const aHasAny = a.froms ? a.froms.includes('any') : false;
        const bHasAny = b.froms ? b.froms.includes('any') : false;
        const aLength = a.froms ? a.froms.length : 0;
        const bLength = b.froms ? b.froms.length : 0;

        if(aHasAny != bHasAny)
            return aHasAny ? 1 : -1;
        else if(!aHasAny && !bHasAny)
            return aLength - bLength;
        else if(aHasAny && bHasAny)
            return bLength - aLength;
    });

    return candidates[0];
}

function isPageCommand(page, command) {
    if(!page || !command || command == '') return false;
    if(!page.commands) return false;
    if(page.commands.length === 0) return false;
    let included = page.commands.includes(command.toLowerCase().trim());
    let any = page.commands.includes('any');
    return(any != included);
}

function isPageFromToken(froms, token) {
    if(token == 'any' || !token || token == '' || !froms || froms == '') return false;
    
    return (froms.includes('any') != froms.includes(token));
}

function addPage(fileName, fileContent) {
    var page = {};

    page.fileName = fileName.split('.').slice(0, -1).join('.');

    page.commands = getPageProperty('commands', fileContent);
    page.from = getPageProperty('from', fileContent);

    var inGameFileName = getPageProperty('file', fileContent);
    page.isFile = (inGameFileName != undefined);
    if(page.isFile) page.title = inGameFileName[0];

    page.content = stripProperties(fileContent);
    pages.push(page);
}

function stripProperties(pageContent) {
    if(pageContent == null) return;
    var lines = pageContent.split('\n');
    for (let i = lines.length; i >= 0; i--) {
        if(!lines[i]) continue;
        if(lines[i].startsWith('$')) lines.splice(i, 1);
    }
    return lines.join('\n');
}


function getPageProperty(property, pageContent) {
    if(pageContent == null) return;
    var lines = pageContent.split('\n');
    for (let i = 0; i < lines.length; i++) {
        let arguments = getPagePropertyFromLine(property, lines[i]);
        if(arguments) return arguments;
    }
}

function getPagePropertyFromLine(property, line) {
    var propertyTag = '$' + property + ': ';
    if(line.toLowerCase().startsWith(propertyTag)) {
        arguments = line.toLowerCase().replace(propertyTag, '').trim().split(',');
        if(!arguments) return;

        for (let i = arguments.length; i >= 0; i--) {
            if(!arguments[i] || arguments[i] == '') {
                arguments.splice(i, 1);
                continue;
            }
            arguments[i] = arguments[i].trim();
        }
        if(arguments.length > 0) return arguments;
    }
}

function sendContent(res, content, token) {
    res.json({
        content: content,
        token: token
    })
}

const fileFooter = '\n\n\n--------------------------- [FIN DU FICHIER] -----------------------------\n\nEntrez "exit" pour quitter';

function getFileHeader(fileName) {
    var content = '';
    var padNumber = (charsByLine - (fileName.length + 2)) / 2;
    for (let i = 0; i < Math.floor(padNumber); i++) {
        content += '▓';
    }
    content += ' ' + fileName + ' ';
    for (let i = 0; i < Math.ceil(padNumber); i++) {
        content += '▓';
    }
    content += '\n';
    for (let i = 0; i < charsByLine; i++) {
        content += '-';
    }
    content += '\n\n';
    return content;
}