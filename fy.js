const http = require('http');
const crypto = require('crypto');
const querystring = require('querystring');
const process = require('process');



const appKey = '';
const appSecret = '';
const API_URL = 'http://openapi.youdao.com/api?';


const COMPILE = /[A-Z]{1}[a-z]+/g;
const COMPILE_CHAR = /[-_\n\r\t*]/g;
const COMPILE_SPAN = /[\ ]+/g;

function filter(q) {
    q = q.replace(COMPILE, (e) => {
        return ' ' + e;
    });
    q = q.replace(COMPILE_CHAR, ' ');
    q = q.replace(COMPILE_SPAN, ' ');
    return q;
}

 const ErrorCode = {
    '101': '缺少必填的参数',
    '102': '不支持的语言类型',
    '103': '翻译文本过长',
    '104': '不支持的API类型',
    '105': '不支持的签名类型',
    '106': '不支持的响应类型',
    '107': '不支持的传输加密类型',
    '108': 'appKey无效',
    '109': 'batchLog格式不正确',
    '110': '无相关服务的有效实例',
    '111': '开发者账号无效',
    '113': 'q不能为空',
    '201': '解密失败，可能为DES,BASE64,URLDecode的错误',
    '202': '签名检验失败',
    '203': '访问IP地址不在可访问IP列表',
    '205': '请求的接口与应用的平台类型不一致',
    '301': '辞典查询失败',
    '302': '翻译查询失败',
    '303': '服务端的其它异常',
    '401': '账户已经欠费',
    '411': '访问频率受限,请稍后访问',
    '412': '长请求过于频繁，请稍后访问',
};

const Lang = {
    'zh-CHS': '中文',
    'ja': '日文',
    'EN': '英文',
    'ko': '韩文',
    'fr': '法文',
    'ru': '俄文',
    'pt': '葡萄牙文',
    'es': '西班牙文',
    'vi': '越南文',
};



const ReqData = {
    'q': 'Hello World!',
    'from': Lang.EN,
    'to': Lang["zh-CHS"],
    'appKey': '',
    'salt': '',
    'sign': '',
};

function md5(content) {
    let md5 = crypto.createHash('md5');
    md5.update(content);
    let req = md5.digest('hex');
    return req;
}
function sign(a, s) {
    let signStr = a.appKey + a.q + a.salt + s;
    a.sign = md5(signStr).toUpperCase();
}


function guid() {
    let a = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        let r = Math.random() * 16 | 0;
        let v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
    return a;
}

function fy(q) {
    if(q) {
        ReqData.q = filter(q);
    }
    ReqData.salt = guid();
    ReqData.appKey = appKey;
    sign(ReqData, appSecret);
    let reqUrl = API_URL + querystring.stringify(ReqData);
    //console.log(reqUrl)
    http.get(reqUrl, (res) => {
        const { statusCode } = res;
        const contentType = res.headers['content-type'];

        let error;
        if (statusCode !== 200) {
            error = new Error('请求失败。\n' +
                `状态码: ${statusCode}`);
        } else if (contentType === undefined || !/^application\/json/.test(contentType)) {
            error = new Error('无效的 content-type.\n' +
                `期望 application/json 但获取的是 ${contentType}`);
        }
        if (error) {
            console.error(error.message);
            // 消耗响应数据以释放内存
            res.resume();
            return;
        }

        res.setEncoding('utf8');
        let rawData = '';
        res.on('data', (chunk) => { rawData += chunk; });
        res.on('end', () => {
            try {
                const parsedData = JSON.parse(rawData);
                if (parsedData.errorCode !== '0') {
                    parsedData.errorMsg = ErrorCode[parsedData.errorCode];
                    console.error(parsedData.errorMsg);
                } else {
                    let showMsg = '';
                    showMsg += '原    文: ' + ReqData.q;
                    showMsg += '\n翻译结果: ' + parsedData.translation;
                    showMsg += "\n词    义: ";
                    for (let v in parsedData.web) {
                        showMsg += "\n    " + parsedData.web[v].key + ": " + parsedData.web[v].value;
                    }
                    console.log(showMsg);
                }
            } catch (e) {
                console.error(e.message);
            }
        });
    }).on('error', (e) => {
        console.error(`错误: ${e.message}`);
    });
}

fy(process.argv.splice(2).join(' '));