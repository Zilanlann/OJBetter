// ==UserScript==
// @name         Codeforces Better! (a different version)
// @namespace    https://greasyfork.org/users/904932
// @version      1.69
// @description  Codeforces界面汉化、黑暗模式支持、题目翻译、markdown视图、一键复制题目、跳转到洛谷、评论区分页、ClistRating分显示、榜单重新着色
// @author       Zilanlann
// @match        *://*.codeforces.com/*
// @match        *://*.codeforc.es/*
// @run-at       document-start
// @connect      www2.deepl.com
// @connect      www.iflyrec.com
// @connect      m.youdao.com
// @connect      api.interpreter.caiyunai.com
// @connect      translate.google.com
// @connect      openai.api2d.net
// @connect      api.openai.com
// @connect      www.luogu.com.cn
// @connect      clist.by
// @connect      greasyfork.org
// @connect      rextester.com
// @connect      codechef.com
// @connect      wandbox.org
// @connect      *
// @grant        GM_xmlhttpRequest
// @grant        GM_info
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_addStyle
// @grant        GM_setClipboard
// @grant        GM_getResourceText
// @icon         https://aowuucdn.oss-cn-beijing.aliyuncs.com/codeforces.png
// @require      https://cdn.staticfile.org/turndown/7.1.2/turndown.min.js
// @require      https://cdn.staticfile.org/markdown-it/13.0.1/markdown-it.min.js
// @require      https://cdn.bootcdn.net/ajax/libs/crypto-js/4.1.1/crypto-js.min.js
// @require      https://cdn.staticfile.org/chroma-js/2.4.2/chroma.min.js
// @require      https://aowuucdn.oss-cn-beijing.aliyuncs.com/code_completer-0.0.11.min.js
// @require      https://cdn.staticfile.org/xterm/3.9.2/xterm.min.js
// @require      https://cdn.staticfile.org/dexie/3.2.4/dexie.min.js
// @resource     wandboxlist https://wandbox.org/api/list.json
// @resource     xtermcss https://cdn.staticfile.org/xterm/3.9.2/xterm.min.css
// @license      MIT
// @compatible	 Chrome
// @compatible	 Firefox
// @compatible	 Edge
// @incompatible safari
// @supportURL   https://github.com/beijixiaohu/OJBetter/issues
// ==/UserScript==

// 状态与初始化
const getGMValue = (key, defaultValue) => {
    const value = GM_getValue(key);
    if (value === undefined || value === "") {
        GM_setValue(key, defaultValue);
        return defaultValue;
    }
    return value;
};
var darkMode = getGMValue("darkMode", "follow");
var hostAddress = location.origin;
var is_mSite, is_acmsguru, is_oldLatex, is_contest, is_problem, is_problemset_problem, is_problemset, is_cfStandings;
var bottomZh_CN, showLoading, hoverTargetAreaDisplay, expandFoldingblocks, renderPerfOpt, translation, commentTranslationChoice;
var openai_model, openai_key, openai_proxy, openai_header, openai_data, opneaiConfig;
var commentTranslationMode, retransAction, transWaitTime, replaceSymbol, commentPaging, showJumpToLuogu, loaded;
var showClistRating_contest, showClistRating_problem, showClistRating_problemset, RatingHidden, clist_Authorization;
var standingsRecolor, problemPageCodeEditor, keywordAutoComplete, cppCodeTemplateComplete;
var compilerSelection, editorFontSize, indentSpacesCount, howToIndent, isWrapEnabled, onlineCompilerChoice, codecheCsrfToken;
var CF_csrf_token;
function init() {
    const { hostname, href } = window.location;
    is_mSite = hostname.startsWith('m');
    is_oldLatex = $('.tex-span').length;
    is_acmsguru = href.includes("acmsguru") && href.includes('/problem/');
    is_contest = /\/contest\/[\d\/\s]+$/.test(href) && !href.includes('/problem/');
    is_problem = href.includes('/problem/');
    is_problemset_problem = href.includes('/problemset/') && href.includes('/problem/');
    is_problemset = href.includes('/problemset') && !href.includes('/problem/');
    is_cfStandings = href.includes('/standings') &&
        $('.standings tr:first th:nth-child(n+5)')
            .map(function() {
                return $(this).find('span').text();
            })
            .get()
            .every(score => /^[0-9]+$/.test(score));
    bottomZh_CN = getGMValue("bottomZh_CN", true);
    showLoading = getGMValue("showLoading", true);
    hoverTargetAreaDisplay = getGMValue("hoverTargetAreaDisplay", false);
    expandFoldingblocks = getGMValue("expandFoldingblocks", true);
    renderPerfOpt = getGMValue("renderPerfOpt", false);
    commentPaging = getGMValue("commentPaging", true);
    showJumpToLuogu = getGMValue("showJumpToLuogu", true);
    standingsRecolor = getGMValue("standingsRecolor", true);
    loaded = getGMValue("loaded", false);
    translation = getGMValue("translation", "deepl");
    commentTranslationMode = getGMValue("commentTranslationMode", "0");
    commentTranslationChoice = getGMValue("commentTranslationChoice", "0");
    retransAction = getGMValue("retransAction", "0");
    transWaitTime = getGMValue("transWaitTime", "200");
    replaceSymbol = getGMValue("replaceSymbol", "2");
    showClistRating_contest = getGMValue("showClistRating_contest", false);
    showClistRating_problem = getGMValue("showClistRating_problem", false);
    showClistRating_problemset = getGMValue("showClistRating_problemset", false);
    RatingHidden = getGMValue("RatingHidden", false);
    clist_Authorization = getGMValue("clist_Authorization", "");
    // 编辑器
    compilerSelection = getGMValue("compilerSelection", "61");
    editorFontSize = getGMValue("editorFontSize", "15");
    indentSpacesCount = getGMValue("indentSpacesCount", "4");
    isWrapEnabled = getGMValue("isWrapEnabled", true);
    howToIndent = getGMValue("howToIndent", "space");
    problemPageCodeEditor = getGMValue("problemPageCodeEditor", true);
    keywordAutoComplete = getGMValue("keywordAutoComplete", true);
    cppCodeTemplateComplete = getGMValue("cppCodeTemplateComplete", true);
    onlineCompilerChoice = getGMValue("onlineCompilerChoice", "official");
    codecheCsrfToken = getGMValue("codecheCsrfToken", "");
    //openai
    opneaiConfig = getGMValue("chatgpt-config", {
        "choice": -1,
        "configurations": []
    });
    if (opneaiConfig.choice !== -1 && opneaiConfig.configurations.length !== 0) {
        const configAtIndex = opneaiConfig.configurations[opneaiConfig.choice];

        if (configAtIndex == undefined) {
            let existingConfig = GM_getValue('chatgpt-config');
            existingConfig.choice = 0;
            GM_setValue('chatgpt-config', existingConfig);
            location.reload();
        }

        openai_model = configAtIndex.model;
        openai_key = configAtIndex.key;
        openai_proxy = configAtIndex.proxy;
        openai_header = configAtIndex._header ?
            configAtIndex._header.split("\n").map(header => {
                const [key, value] = header.split(":");
                return { [key.trim()]: value.trim() };
            }) : [];
        openai_data = configAtIndex._data ?
            configAtIndex._data.split("\n").map(header => {
                const [key, value] = header.split(":");
                return { [key.trim()]: value.trim() };
            }) : [];
    }
}

// 显示警告消息
function ShowAlertMessage() {
    if (is_oldLatex) {
        let newElement = $("<div></div>").addClass("alert alert-warning ojbetter-alert")
            .html(`Codeforces Better! —— 注意：当前页面存在未保存原 LaTeX 代码的 LaTeX 公式（这通常是一道古老的题目），这导致脚本无法将其还原回 LaTeX，因此当前页面部分功能不适用。
                <br>此外当前页面的翻译功能采用了特别的实现方式，因此可能会出现排版错位的情况。`)
            .css({ "margin": "1em", "text-align": "center", "position": "relative" });
        $(".menu-box:first").next().after(newElement);
    }
    if (is_acmsguru) {
        let newElement = $("<div></div>").addClass("alert alert-warning ojbetter-alert")
            .html(`Codeforces Better! —— 注意：当前页面为 acmsguru 题目（这是一道非常古老的题目），部分功能不适用。
                <br>此外当前页面的翻译功能采用了特别的实现方式，因此可能会出现排版错位的情况。`)
            .css({ "margin": "1em", "text-align": "center", "position": "relative" });
        $(".menu-box:first").next().after(newElement);
    }
    if (commentTranslationMode == "1") {
        let newElement = $("<div></div>").addClass("alert alert-error CFBetter_alert")
            .html(`Codeforces Better! —— 注意！当前为分段翻译模式，这会造成负面效果，<p>除非你现在需要翻译超长篇的博客或者题目，否则请前往设置切换为普通模式</p>`)
            .css({ "margin": "1em", "text-align": "center", "position": "relative" });
        $(".menu-box:first").next().after(newElement);
    }
    if (commentTranslationMode == "2") {
        let newElement = $("<div></div>").addClass("alert alert-error CFBetter_alert")
            .html(`Codeforces Better! —— 注意！当前为选段翻译模式，只会翻译目标区域内已选中的部分，点击段落以选中（橙色框）<br>
            <p>如果你现在不需要翻译超长篇的博客或者题目，建议你请前往设置切换为普通模式</p>`)
            .css({ "margin": "1em", "text-align": "center", "position": "relative" });
        $(".menu-box:first").next().after(newElement);
    }
}

// 常量
const findHelpText = '\n\n如果无法解决，请前往 https://greasyfork.org/zh-CN/scripts/465777/feedback 寻求帮助\n\n';
const helpCircleHTML = '<div class="help-icon"><svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M512 64a448 448 0 1 1 0 896 448 448 0 0 1 0-896zm23.744 191.488c-52.096 0-92.928 14.784-123.2 44.352-30.976 29.568-45.76 70.4-45.76 122.496h80.256c0-29.568 5.632-52.8 17.6-68.992 13.376-19.712 35.2-28.864 66.176-28.864 23.936 0 42.944 6.336 56.32 19.712 12.672 13.376 19.712 31.68 19.712 54.912 0 17.6-6.336 34.496-19.008 49.984l-8.448 9.856c-45.76 40.832-73.216 70.4-82.368 89.408-9.856 19.008-14.08 42.24-14.08 68.992v9.856h80.96v-9.856c0-16.896 3.52-31.68 10.56-45.76 6.336-12.672 15.488-24.64 28.16-35.2 33.792-29.568 54.208-48.576 60.544-55.616 16.896-22.528 26.048-51.392 26.048-86.592 0-42.944-14.08-76.736-42.24-101.376-28.16-25.344-65.472-37.312-111.232-37.312zm-12.672 406.208a54.272 54.272 0 0 0-38.72 14.784 49.408 49.408 0 0 0-15.488 38.016c0 15.488 4.928 28.16 15.488 38.016A54.848 54.848 0 0 0 523.072 768c15.488 0 28.16-4.928 38.72-14.784a51.52 51.52 0 0 0 16.192-38.72 51.968 51.968 0 0 0-15.488-38.016 55.936 55.936 0 0 0-39.424-14.784z"></path></svg></div>';
const unfoldIcon = `<svg t="1695971616104" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="2517" width="18" height="18"><path d="M747.451 527.394L512.376 707.028l-235.071-185.71a37.975 37.975 0 0 0-23.927-8.737 38 38 0 0 0-29.248 13.674 37.984 37.984 0 0 0 4.938 53.552l259.003 205.456c14.013 11.523 34.219 11.523 48.231 0l259.003-199.002a37.974 37.974 0 0 0 5.698-53.552 37.982 37.982 0 0 0-53.552-5.315z m0 0" p-id="2518"></path><path d="M488.071 503.845c14.013 11.522 34.219 11.522 48.231 0l259.003-199.003a37.97 37.97 0 0 0 13.983-25.591 37.985 37.985 0 0 0-8.285-27.959 37.97 37.97 0 0 0-25.591-13.979 37.985 37.985 0 0 0-27.96 8.284L512.376 425.61 277.305 239.899a37.974 37.974 0 0 0-23.927-8.736 37.993 37.993 0 0 0-29.248 13.674 37.984 37.984 0 0 0 4.938 53.552l259.003 205.456z m0 0" p-id="2519"></path></svg>`;
const putawayIcon = `<svg t="1695971573189" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="2266" width="18" height="18"><path d="M276.549 496.606l235.075-179.634 235.071 185.711a37.975 37.975 0 0 0 23.927 8.737 38 38 0 0 0 29.248-13.674 37.986 37.986 0 0 0-4.938-53.552L535.929 238.737c-14.013-11.523-34.219-11.523-48.231 0L228.695 437.739a37.974 37.974 0 0 0-5.698 53.552 37.982 37.982 0 0 0 53.552 5.315z m0 0" p-id="2267"></path><path d="M535.929 520.155c-14.013-11.522-34.219-11.522-48.231 0L228.695 719.158a37.97 37.97 0 0 0-13.983 25.591 37.985 37.985 0 0 0 8.285 27.959 37.97 37.97 0 0 0 25.591 13.979 37.985 37.985 0 0 0 27.96-8.284L511.624 598.39l235.071 185.711a37.974 37.974 0 0 0 23.927 8.736 37.993 37.993 0 0 0 29.248-13.674 37.984 37.984 0 0 0-4.938-53.552L535.929 520.155z m0 0" p-id="2268"></path></svg>`;
const closeIcon = `<svg t="1696693011050" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="4322" width="14" height="14"><path d="M0 0h1024v1024H0z" fill-opacity="0" p-id="4323"></path><path d="M240.448 168l2.346667 2.154667 289.92 289.941333 279.253333-279.253333a42.666667 42.666667 0 0 1 62.506667 58.026666l-2.133334 2.346667-279.296 279.210667 279.274667 279.253333a42.666667 42.666667 0 0 1-58.005333 62.528l-2.346667-2.176-279.253333-279.253333-289.92 289.962666a42.666667 42.666667 0 0 1-62.506667-58.005333l2.154667-2.346667 289.941333-289.962666-289.92-289.92a42.666667 42.666667 0 0 1 57.984-62.506667z" p-id="4324"></path></svg>`;
const copyIcon = `<svg t="1695970366492" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="2499" width="16" height="16"><path d="M720 192h-544A80.096 80.096 0 0 0 96 272v608C96 924.128 131.904 960 176 960h544c44.128 0 80-35.872 80-80v-608C800 227.904 764.128 192 720 192z m16 688c0 8.8-7.2 16-16 16h-544a16 16 0 0 1-16-16v-608a16 16 0 0 1 16-16h544a16 16 0 0 1 16 16v608z" p-id="2500"></path><path d="M848 64h-544a32 32 0 0 0 0 64h544a16 16 0 0 1 16 16v608a32 32 0 1 0 64 0v-608C928 99.904 892.128 64 848 64z" p-id="2501"></path><path d="M608 360H288a32 32 0 0 0 0 64h320a32 32 0 1 0 0-64zM608 520H288a32 32 0 1 0 0 64h320a32 32 0 1 0 0-64zM480 678.656H288a32 32 0 1 0 0 64h192a32 32 0 1 0 0-64z" p-id="2502"></path></svg>`;
const copyedIcon = `<svg t="1697105956577" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="986" width="16" height="16"><path d="M928 612.8V144c0-44.8-35.2-80-80-80H304c-17.6 0-32 14.4-32 32s14.4 32 32 32h544c8 0 16 8 16 16v425.6c-19.2-9.6-41.6-16-64-17.6V272c0-44.8-35.2-80-80-80H176c-44.8 0-80 35.2-80 80v608c0 44.8 35.2 80 80 80h460.8c36.8 27.2 83.2 43.2 132.8 43.2 126.4 0 227.2-100.8 227.2-227.2 0-64-27.2-121.6-68.8-163.2zM176 896c-8 0-16-8-16-16V272c0-8 8-16 16-16h544c8 0 16 8 16 16v280c-108.8 16-193.6 110.4-193.6 224 0 44.8 12.8 84.8 33.6 120H176z m593.6 72c-19.2 0-36.8-3.2-54.4-8-38.4-11.2-72-33.6-96-64-25.6-32-41.6-75.2-41.6-120 0-94.4 67.2-172.8 158.4-188.8 11.2-1.6 22.4-3.2 33.6-3.2 11.2 0 20.8 0 30.4 1.6 22.4 3.2 44.8 11.2 64 22.4 25.6 14.4 48 35.2 64 59.2 20.8 30.4 33.6 68.8 33.6 108.8 0 107.2-84.8 192-192 192z" p-id="987"></path>
<path d="M608 360H288c-17.6 0-32 14.4-32 32s14.4 32 32 32h320c17.6 0 32-14.4 32-32s-14.4-32-32-32z m0 160H288c-17.6 0-32 14.4-32 32s14.4 32 32 32h320c17.6 0 32-14.4 32-32s-14.4-32-32-32z m-128 158.4H288c-17.6 0-32 14.4-32 32s14.4 32 32 32h192c17.6 0 32-14.4 32-32s-14.4-32-32-32zM731.2 886.4c-6.4 0-11.2-1.6-16-6.4l-73.6-73.6c-9.6-9.6-9.6-22.4 0-32s22.4-9.6 32 0l57.6 57.6 137.6-137.6c9.6-9.6 22.4-9.6 32 0s9.6 22.4 0 32L747.2 880c-4.8 3.2-9.6 6.4-16 6.4z" p-id="988"></path></svg>`;
const translateIcon = `<svg t="1696837407077" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="6325" width="22" height="22"><path d="M536.380952 121.904762a73.142857 73.142857 0 0 1 73.142858 73.142857v219.428571h219.428571a73.142857 73.142857 0 0 1 73.142857 73.142858v341.333333a73.142857 73.142857 0 0 1-73.142857 73.142857H487.619048a73.142857 73.142857 0 0 1-73.142858-73.142857v-219.428571H195.047619a73.142857 73.142857 0 0 1-73.142857-73.142858V195.047619a73.142857 73.142857 0 0 1 73.142857-73.142857h341.333333zM243.809524 682.666667v97.523809h97.523809v73.142857h-97.523809a73.142857 73.142857 0 0 1-73.142857-73.142857v-97.523809h73.142857z m585.142857-195.047619h-219.428571v48.761904a73.142857 73.142857 0 0 1-73.142858 73.142858h-48.761904v219.428571h341.333333V487.619048z m-115.760762 89.526857L787.21219 780.190476h-62.025142l-14.043429-42.715428h-76.068571L620.739048 780.190476h-60.854858l74.605715-203.044571h78.701714z m-38.034286 50.029714h-3.510857l-21.065143 63.488h45.348572l-20.772572-63.488zM536.380952 195.047619H195.047619v341.333333h341.333333V195.047619z 
m-195.072 49.883429l44.78781 1.072762v37.278476h87.698286v145.359238h-87.698286v65.974857h-44.78781v-65.974857h-87.698285v-145.359238h87.698285v-38.351238z m0 83.139047h-44.787809v56.05181h44.787809v-56.05181z m89.307429 0h-44.519619v56.05181h44.519619v-56.05181zM780.190476 170.666667a73.142857 73.142857 0 0 1 73.142857 73.142857v97.523809h-73.142857v-97.523809h-97.523809V170.666667h97.523809z" p-id="6326"></path></svg>`;
const clistIcon = `<svg width="37.7pt" height="10pt" viewBox="0 0 181 48" version="1.1" xmlns="http://www.w3.org/2000/svg"><g id="#0057b8ff"><path fill="#0057b8" opacity="1.00" d=" M 17.36 0.00 L 18.59 0.00 C 23.84 6.49 30.28 11.92 36.01 17.98 C 34.01 19.99 32.01 21.99 30.00 23.99 C 26.02 19.97 22.02 15.98 18.02 11.99 C 14.01 15.98 10.01 19.99 6.00 23.99 C 4.16 22.04 2.30 20.05 0.00 18.61 L 0.00 17.37 C 3.44 15.11 6.00 11.84 8.96 9.03 C 11.79 6.05 15.09 3.47 17.36 0.00 Z" /></g><g id="#a0a0a0ff"><path fill="#a0a0a0" opacity="1.00" d=" M 56.76 13.74 C 61.48 4.80 76.07 3.90 81.77 12.27 C 83.09 13.94 83.44 16.10 83.91 18.12 C 81.53 18.23 79.16 18.24 76.78 18.23 C 75.81 15.72 73.99 13.31 71.14 12.95 C 67.14 12.02 63.45 15.29 62.48 18.99 C 61.30 23.27 61.71 28.68 65.34 31.70 C 67.82 34.05 72.19 33.93 74.61 31.55 C 75.97 30.18 76.35 28.23 76.96 26.48 C 79.36 26.43 81.77 26.44 84.17 26.56 C 83.79 30.09 82.43 33.49 79.89 36.02 C 74.14 41.35 64.17 40.80 58.77 35.25 C 53.52 29.56 53.18 20.38 56.76 13.74 Z" />
<path fill="#a0a0a0" opacity="1.00" d=" M 89.01 7.20 C 91.37 7.21 93.74 7.21 96.11 7.22 C 96.22 15.71 96.10 24.20 96.18 32.69 C 101.25 32.76 106.32 32.63 111.39 32.79 C 111.40 34.86 111.41 36.93 111.41 39.00 C 103.94 39.00 96.47 39.00 89.00 39.00 C 89.00 28.40 88.99 17.80 89.01 7.20 Z" /><path fill="#a0a0a0" opacity="1.00" d=" M 115.00 7.21 C 117.33 7.21 119.66 7.21 121.99 7.21 C 122.01 17.81 122.00 28.40 122.00 39.00 C 119.67 39.00 117.33 39.00 115.00 39.00 C 115.00 28.40 114.99 17.80 115.00 7.21 Z" /><path fill="#a0a0a0" opacity="1.00" d=" M 133.35 7.47 C 139.11 5.56 146.93 6.28 150.42 11.87 C 151.42 13.39 151.35 15.31 151.72 17.04 C 149.33 17.05 146.95 17.05 144.56 17.03 C 144.13 12.66 138.66 11.12 135.34 13.30 C 133.90 14.24 133.54 16.87 135.35 17.61 C 139.99 20.02 145.90 19.54 149.92 23.19 C 154.43 26.97 153.16 35.36 147.78 37.72 C 143.39 40.03 137.99 40.11 133.30 38.69 C 128.80 37.34 125.34 32.90 125.91 28.10 C 128.22 28.10 130.53 28.11 132.84 28.16 C 132.98 34.19 142.68 36.07 145.18 30.97 C 146.11 27.99 142.17 27.05 140.05 26.35 C 135.54 25.04 129.83 24.33 127.50 19.63 C 125.30 14.78 128.42 9.00 133.35 7.47 Z" />
<path fill="#a0a0a0" opacity="1.00" d=" M 153.31 7.21 C 161.99 7.21 170.67 7.21 179.34 7.21 C 179.41 9.30 179.45 11.40 179.48 13.50 C 176.35 13.50 173.22 13.50 170.09 13.50 C 170.05 21.99 170.12 30.48 170.05 38.98 C 167.61 39.00 165.18 39.00 162.74 39.00 C 162.64 30.52 162.73 22.04 162.69 13.55 C 159.57 13.49 156.44 13.49 153.32 13.50 C 153.32 11.40 153.31 9.31 153.31 7.21 Z" /></g><g id="#ffd700ff"><path fill="#ffd700" opacity="1.00" d=" M 12.02 29.98 C 14.02 27.98 16.02 25.98 18.02 23.98 C 22.01 27.99 26.03 31.97 30.00 35.99 C 34.01 31.99 38.01 27.98 42.02 23.99 C 44.02 25.98 46.02 27.98 48.01 29.98 C 42.29 36.06 35.80 41.46 30.59 48.00 L 29.39 48.00 C 24.26 41.42 17.71 36.08 12.02 29.98 Z" /></g></svg>`;
const darkenPageStyle = `body::before { content: ""; display: block; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.4); z-index: 100; }`;
const darkenPageStyle2 = `body::before { content: ""; display: block; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.4); z-index: 300; }`;

// 连接数据库
var CFBetterDB;
function initDB() {
    CFBetterDB = new Dexie('CFBetterDB');
    CFBetterDB.version(1).stores({
        samplesData: `&url`,
        editorCode: `&url`
    });
}

// 切换系统黑暗监听
const mediaQueryList = window.matchMedia('(prefers-color-scheme: dark)');
const changeEventListeners = [];
function handleColorSchemeChange(event) {
    const newColorScheme = event.matches ? $('html').attr('data-theme', 'dark') : $('html').attr('data-theme', 'light');
    if (!event.matches) {
        var originalColor = $(this).data("original-color");
        $(this).css("background-color", originalColor);
    }
}

// 黑暗模式
(function setDark() {
    // 初始化
    function setDarkTheme() {
        const htmlElement = document.querySelector('html');
        if (htmlElement) {
            htmlElement.setAttribute('data-theme', 'dark');
        } else {
            setTimeout(setDarkTheme, 100);
        }
    }
    if (darkMode == "dark") {
        setDarkTheme();
    } else if (darkMode == "follow") {
        // 添加事件监听器
        changeEventListeners.push(handleColorSchemeChange);
        mediaQueryList.addEventListener('change', handleColorSchemeChange);

        if (window.matchMedia('(prefers-color-scheme: dark)').matches) setDarkTheme();
    }

    GM_addStyle(`
        /* 黑暗支持 */
        html[data-theme=dark]:root {
            color-scheme: light dark;
        }
        /* 文字颜色1 */
        html[data-theme=dark] .title,html[data-theme=dark] .problem-statement,
        html[data-theme=dark] .ttypography, html[data-theme=dark] .roundbox, html[data-theme=dark] .info,
        html[data-theme=dark] .ttypography .bordertable, html[data-theme=dark] .ttypography .bordertable thead th,
        html[data-theme=dark] .ttypography h1, html[data-theme=dark] .ttypography h2, html[data-theme=dark] .ttypography h3,
        html[data-theme=dark] .ttypography h4, html[data-theme=dark] .ttypography h5, html[data-theme=dark] .ttypography h6
        html[data-theme=dark] .datatable table, html[data-theme=dark] .problem-statement .sample-tests pre,
        html[data-theme=dark] .alert-success, html[data-theme=dark] .alert-info, html[data-theme=dark] .alert-error,
        html[data-theme=dark] .alert-warning, html[data-theme=dark] .markItUpEditor, html[data-theme=dark] #pageContent,
        html[data-theme=dark] .ace-chrome .ace_gutter, html[data-theme=dark] .translate-problem-statement,
        html[data-theme=dark] .setting-name, html[data-theme=dark] .CFBetter_setting_menu, html[data-theme=dark] .help_tip .tip_text,
        html[data-theme=dark] textarea, html[data-theme=dark] .user-black, html[data-theme=dark] .comments label.show-archived,
        html[data-theme=dark] .comments label.show-archived *, html[data-theme=dark] table,
        html[data-theme=dark] #items-per-page, html[data-theme=dark] #pagBar, html[data-theme=dark] .CFBetter_setting_sidebar li a:link,
        html[data-theme=dark] .popup .content{
            color: #a0adb9 !important;
        }
        html[data-theme=dark] h1 a, html[data-theme=dark] h2 a, html[data-theme=dark] h3 a, html[data-theme=dark] h4 a{
            color: #adbac7;
        }
        /* 文字颜色2 */
        html[data-theme=dark] .contest-state-phase, html[data-theme=dark] .legendary-user-first-letter,
        html[data-theme=dark] .lang-chooser,
        html[data-theme=dark] .second-level-menu-list li a, html[data-theme=dark] #footer,
        html[data-theme=dark] .ttypography .tt, html[data-theme=dark] select,
        html[data-theme=dark] .roundbox .caption, html[data-theme=dark] .topic .title *,
        html[data-theme=dark] .user-admin, html[data-theme=dark] button.html2mdButton:hover,
        html[data-theme=dark] .CFBetter_modal button{
            color: #9099a3 !important;
        }
        /* 文字颜色3 */
        html[data-theme=dark] button.html2mdButton, html[data-theme=dark] #program-source-text-copy{
            color: #6385a6;
        }
        html[data-theme=dark] input{
            color: #6385a6 !important;
        }
        /* 文字颜色4 */
        html[data-theme=dark] .ttypography .MathJax, html[data-theme=dark] .MathJax span{
            color: #cbd6e2 !important;
        }
        /* 链接颜色 */
        html[data-theme=dark] a:link {
            color: #3989c9;
        }
        html[data-theme=dark] a:visited {
            color: #8590a6;
        }
        html[data-theme=dark] .menu-box a, html[data-theme=dark] .sidebox th a{
            color: #9099a3 !important;
        }
        /* 按钮 */
        html[data-theme=dark] .second-level-menu-list li.backLava {
            border-radius: 6px;
            overflow: hidden;
            filter: invert(1) hue-rotate(.5turn);
        }
        html[data-theme=dark] input:hover{
            background-color: #22272e !important;
        }
        /* 背景层次1 */
        html[data-theme=dark] body, html[data-theme=dark] .ttypography .bordertable thead th,
        html[data-theme=dark] .datatable table, html[data-theme=dark] .datatable .dark, html[data-theme=dark] li#add_button,
        html[data-theme=dark] .problem-statement .sample-tests pre, html[data-theme=dark] .markItUpEditor,
        html[data-theme=dark] .SumoSelect>.CaptionCont, html[data-theme=dark] .SumoSelect>.optWrapper,
        html[data-theme=dark] .SumoSelect>.optWrapper.multiple>.options li.opt span i, html[data-theme=dark] .ace_scroller,
        html[data-theme=dark] .CFBetter_setting_menu, html[data-theme=dark] .help_tip .tip_text, html[data-theme=dark] li#add_button:hover,
        html[data-theme=dark] textarea, html[data-theme=dark] .state, html[data-theme=dark] .ace-chrome .ace_gutter-active-line,
        html[data-theme=dark] .sidebar-menu ul li:hover, html[data-theme=dark] .sidebar-menu ul li.active,
        html[data-theme=dark] label.config_bar_ul_li_text:hover, html[data-theme=dark] button.html2mdButton:hover,
        html[data-theme=dark] .CFBetter_setting_sidebar li a.active, html[data-theme=dark] .CFBetter_setting_sidebar li,
        html[data-theme=dark] .CFBetter_setting_menu::-webkit-scrollbar-track, html[data-theme=dark] .CFBetter_setting_content::-webkit-scrollbar-track,
        html[data-theme=dark] .CFBetter_modal, html[data-theme=dark] .CFBetter_modal button:hover,
        html[data-theme=dark] .popup .content, html[data-theme=dark] .file.input-view .text, html[data-theme=dark] .file.output-view .text,
        html[data-theme=dark] .file.answer-view .text, html[data-theme=dark] .file.checker-comment-view .text,
        html[data-theme=dark] #config_bar_list{
            background-color: #22272e !important;
        }
        /* 背景层次2 */
        html[data-theme=dark] .roundbox, html[data-theme=dark] .roundbox .dark, html[data-theme=dark] .bottom-links,
        html[data-theme=dark] button.html2mdButton, html[data-theme=dark] .spoiler-content, html[data-theme=dark] input,
        html[data-theme=dark] .problem-statement .test-example-line-even, html[data-theme=dark] .highlight-blue,
        html[data-theme=dark] .ttypography .tt, html[data-theme=dark] select,
        html[data-theme=dark] .alert-success, html[data-theme=dark] .alert-info, html[data-theme=dark] .alert-error,
        html[data-theme=dark] .alert-warning, html[data-theme=dark] .SumoSelect>.optWrapper>.options li.opt:hover,
        html[data-theme=dark] .input-output-copier:hover, html[data-theme=dark] .translate-problem-statement-panel,
        html[data-theme=dark] .aceEditorTd, html[data-theme=dark] .ace-chrome .ace_gutter,
        html[data-theme=dark] .translate-problem-statement, html[data-theme=dark] .datatable,
        html[data-theme=dark] .CFBetter_setting_list,
        html[data-theme=dark] .CFBetter_setting_menu hr, 
        html[data-theme=dark] .highlighted-row td, html[data-theme=dark] .highlighted-row th,
        html[data-theme=dark] .pagination span.active, html[data-theme=dark] .CFBetter_setting_sidebar li a,
        html[data-theme=dark] .CFBetter_setting_menu::-webkit-scrollbar-thumb, html[data-theme=dark] .CFBetter_setting_content::-webkit-scrollbar-thumb,
        html[data-theme=dark] .CFBetter_modal button, html[data-theme=dark] .test-for-popup pre,
        html[data-theme=dark] .popup .content pre, html[data-theme=dark] .popup .content pre code,
        html[data-theme=dark] ul#config_bar_ul::-webkit-scrollbar-thumb{
            background-color: #2d333b !important;
        }
        /* 实线边框颜色-圆角 */
        html[data-theme=dark] .roundbox, html[data-theme=dark] .roundbox .rtable td,
        html[data-theme=dark] button.html2mdButton, html[data-theme=dark] .sidebar-menu ul li,
        html[data-theme=dark] input, html[data-theme=dark] .ttypography .tt, html[data-theme=dark] #items-per-page,
        html[data-theme=dark] .datatable td, html[data-theme=dark] .datatable th,
        html[data-theme=dark] .alert-success, html[data-theme=dark] .alert-info, html[data-theme=dark] .alert-error,
        html[data-theme=dark] .alert-warning, html[data-theme=dark] .translate-problem-statement,
        html[data-theme=dark] textarea, html[data-theme=dark] .input-output-copier{
            border: 1px solid #424b56 !important;
            border-radius: 2px;
        }
        /* 实线边框颜色-无圆角 */
        html[data-theme=dark] .CFBetter_setting_list, html[data-theme=dark] #config_bar_list,
        html[data-theme=dark] label.config_bar_ul_li_text, html[data-theme=dark] .problem-statement .sample-tests .input,
        html[data-theme=dark] .problem-statement .sample-tests .output, html[data-theme=dark] .pagination span.active,
        html[data-theme=dark] .CFBetter_setting_sidebar li, html[data-theme=dark] .CFBetter_setting_menu select,
        html[data-theme=dark] .translate-problem-statement-panel, html[data-theme=dark] .CFBetter_modal button,
        html[data-theme=dark] .test-for-popup pre{
            border: 1px solid #424b56 !important;
        }
        html[data-theme=dark] .roundbox .titled, html[data-theme=dark] .roundbox .rtable th {
            border-bottom: 1px solid #424b56 !important;
        }
        html[data-theme=dark] .roundbox .bottom-links, html[data-theme=dark] #footer{
            border-top: 1px solid #424b56 !important;
        }
        html[data-theme=dark] .topic .content {
            border-left: 4px solid #424b56 !important;
        }
        html[data-theme=dark] .CFBetter_setting_sidebar {
            border-right: 1px solid #424b56 !important;
        }
        html[data-theme=dark] hr {
            border-color: #424b56 !important;
        }
        /* 虚线边框颜色 */
        html[data-theme=dark] .comment-table, html[data-theme=dark] li#add_button,
        html[data-theme=dark] .CFBetter_setting_menu_label_text{
            border: 1px dashed #424b56 !important;
        }
        html[data-theme=dark] li#add_button:hover{
            border: 1px dashed #03A9F4 !important;
            background-color: #2d333b !important;
            color: #03A9F4 !important;
        }
        /* focus-visible */
        html[data-theme=dark] input:focus-visible, html[data-theme=dark] textarea, html[data-theme=dark] select{
            border-width: 1.5px !important;
            outline: none;
        }
        /* 图片-亮度 */
        html[data-theme=dark] img, html[data-theme=dark] #facebox .popup a{
            opacity: .75; 
        }
        /* 反转 */
        html[data-theme=dark] .SumoSelect>.CaptionCont>label>i, html[data-theme=dark] .delete-resource-link,
        html[data-theme=dark] #program-source-text, html[data-theme=dark] .spoiler-content pre,
        html[data-theme=dark] .popup .content pre code{
            filter: invert(1) hue-rotate(.5turn);
        }
        /* 区域遮罩 */
        html[data-theme=dark] .overlay {
            background: repeating-linear-gradient(135deg, #49525f6e, #49525f6e 30px, #49525f29 0px, #49525f29 55px);
            color: #9099a3;
            text-shadow: 0px 0px 2px #000000;
        }
        /* 其他样式 */
        html[data-theme=dark] .rated-user{
            display: initial;
        }
        html[data-theme=dark] .datatable .ilt, html[data-theme=dark] .datatable .irt,
        html[data-theme=dark] .datatable .ilb, html[data-theme=dark] .datatable .irb,
        html[data-theme=dark] .datatable .lt, html[data-theme=dark] .datatable .rt,
        html[data-theme=dark] .datatable .lb, html[data-theme=dark] .datatable .rb{
            background: none;
        }
        html[data-theme=dark] .problems .accepted-problem td.id{
            border-left: 6px solid #47837d !important;
        }
        html[data-theme=dark] .problems .rejected-problem td.id{
            border-left: 6px solid #ef9a9a !important;
        }
        html[data-theme=dark] .problems .accepted-problem td.act {
            background-color: #47837d !important;
            border-radius: 0px;
        }
        html[data-theme=dark] .problems .rejected-problem td.act{
            background-color: #ef9a9a !important;
            border-radius: 0px;
        }
        html[data-theme=dark] .CFBetter_setting_menu, html[data-theme=dark] .CFBetter_modal{
            box-shadow: 0px 0px 0px 4px #2d333b;
            border: 1px solid #2d333b;
        }
        html[data-theme=dark] .collapsible-topic.collapsed .content .collapsible-topic-options:before{
            background-image: linear-gradient(#22272e00, #22272e);
        }
        html[data-theme=dark] .alert{
            text-shadow: none;
        }
        html[data-theme=dark] input[type="radio"]:checked+.CFBetter_setting_menu_label_text {
            color: #a0adb9 !important;
            border: 1px solid #326154 !important;
        }
        /* 评测状态文字颜色 */
        html[data-theme=dark] .verdict-accepted, html[data-theme=dark] .verdict-accepted-challenged,
        html[data-theme=dark] .verdict-successful-challenge{
            color: #0a0 !important;
        }
        html[data-theme=dark] .verdict-failed, html[data-theme=dark] .verdict-challenged{
            color: red !important;
        }
        html[data-theme=dark] .verdict-rejected, html[data-theme=dark] .verdict-unsuccessful-challenge{
            color: #673ab7 !important;
        }
        html[data-theme=dark] .verdict-waiting {
            color: gray !important;
        }
    `);
})()

// 样式
GM_addStyle(`
html {
    scroll-behavior: smooth;
}
:root {
    --vp-font-family-base: "Chinese Quotes", "Inter var", "Inter", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Helvetica, Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
}
span.mdViewContent {
    white-space: pre-wrap;
}
/*翻译区域提示*/
.overlay {
    pointer-events: none;
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: repeating-linear-gradient(135deg, #97e7cacc, #97e7cacc 30px, #e9fbf1cc 0px, #e9fbf1cc 55px);
    border-radius: 5px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #00695C;
    font-size: 16px;
    font-weight: bold;
    text-shadow: 0px 0px 2px #edfcf4;
}
/*翻译div*/
.translate-problem-statement {
    justify-items: start;
    letter-spacing: 1.8px;
    color: #059669;
    background-color: #f9f9fa;
    border: 1px solid #c5ebdf;
    box-shadow: 0px 0px 0.5px 0.5px #defdf3;
    border-radius: 0rem 0rem 0.3rem 0.3rem;
    padding: 5px;
    margin: -5px 0px 6px 0px;
    width: 100%;
    box-sizing: border-box;
    font-size: 13px;
}
.translate-problem-statement.error_translate {
  color: red;
  border-color: red;
}
.translate-problem-statement a, .translate-problem-statement a:link {
    color: #10b981;
    font-weight: 600;
    background: 0 0;
    text-decoration: none;
}
.translate-problem-statement ol, .translate-problem-statement ul {
    display: grid;
    margin-inline-start: 0.8em;
    margin-block-start: 0em;
    margin: 0.5em 0 0 3em;
}
.translate-problem-statement li {
    display: list-item;
    height: auto;
    word-wrap: break-word;
}
.translate-problem-statement ol li {
    list-style-type: auto;
}
.translate-problem-statement ul li {
    list-style-type: disc;
}
.translate-problem-statement img {
    max-width: 100.0%;
    max-height: 100.0%;
}
.ttypography .translate-problem-statement .MathJax {
    color: #059669!important;
}
.translate-problem-statement span.math {
    margin: 0px 2.5px !important;
}
.translate-problem-statement a:hover {
    background-color: #800;
    color: #fff;
    text-decoration: none;
}
.translate-problem-statement-panel{
    display: flex;
    justify-content: space-between;
    background-color: #f9f9fa;
    border: 1px solid #c5ebdf;
    box-shadow: 0px 0px 0.5px 0.5px #defdf3;
    border-radius: 0.3rem;
    margin: 4px 0px;
}
.html2md-panel {
    display: flex;
    justify-content: flex-end;
    align-items: center;
}
.html2md-panel a {
    text-decoration: none;
}
.html2mdButton {
    display: flex;
    align-items: center;
    cursor: pointer;
    background-color: #ffffff;
    color: #606266;
    height: 22px;
    width: auto;
    font-size: 13px;
    border-radius: 0.3rem;
    padding: 1px 5px;
    margin: 5px !important;
    border: 1px solid #dcdfe6;
}
.html2mdButton:hover {
    color: #409eff;
    border-color: #409eff;
    background-color: #f1f8ff;
}
button.html2mdButton.copied {
    background-color: #f0f9eb;
    color: #67c23e;
    border: 1px solid #b3e19d;
}
button.html2mdButton.mdViewed {
    background-color: #fdf6ec;
    color: #e6a23c;
    border: 1px solid #f3d19e;
}
button.html2mdButton.error {
    background-color: #fef0f0;
    color: #f56c6c;
    border: 1px solid #fab6b6;
}
button.translated {
    background-color: #f0f9eb;
    color: #67c23e;
    border: 1px solid #b3e19d;
}
button.html2mdButton.reTranslation {
    background-color: #f4f4f5;
    color: #909399;
    border: 1px solid #c8c9cc;
}
.topText {
    display: flex;
    margin-left: 5px;
    color: #9e9e9e;
    font-size: 13px;
    align-items: center;
}
.borderlessButton{
    display: flex;
    align-items: center;
    margin: 2.5px 7px;
    fill: #9E9E9E;
}
.borderlessButton:hover{
    cursor: pointer;
    fill: #059669;
}
.translate-problem-statement table {
    border: 1px #ccc solid !important;
    margin: 1.5em 0 !important;
    color: #059669 !important;
}
.translate-problem-statement table thead th {
    border: 1px #ccc solid !important;
    color: #059669 !important;
}
.translate-problem-statement table td {
    border-right: 1px solid #ccc;
    border-top: 1px solid #ccc;
    padding: 0.7143em 0.5em;
}
.translate-problem-statement table th {
    padding: 0.7143em 0.5em;
}
.translate-problem-statement p:not(:first-child) {
    margin: 1.5em 0 0;
}
.translate-problem-statement p {
    line-height: 20px !important;
}
.problem-statement p:last-child {
    margin-bottom: 0px !important;
}
/*设置面板*/
header .enter-or-register-box, header .languages {
    position: absolute;
    right: 170px;
}
button.html2mdButton.CFBetter_setting {
    font-family: cuprum,sans-serif!important;
    font-weight: 400;
    text-align: center;
    float: left;
    list-style: none;
    color: #000;
    margin-right: 1.2em;
    //padding: 0 0 1px;
    top: 5px;
}

button.html2mdButton.CFBetter_setting.open {
    background-color: #e6e6e6;
    color: #727378;
    cursor: not-allowed;
}

.CFBetter_setting_menu {
    z-index: 200;
    box-shadow: 0px 0px 0px 4px #ffffff;
    display: grid;
    position: fixed;
    top: 50%;
    left: 50%;
    width: 500px;
    height: 600px;
    transform: translate(-50%, -50%);
    border-radius: 6px;
    background-color: #f0f4f9;
    border-collapse: collapse;
    border: 1px solid #ffffff;
    color: #697e91;
    font-family: var(--vp-font-family-base);
    padding: 10px 20px 20px 10px;
    box-sizing: content-box;
}
.CFBetter_setting_menu h3 {
    margin-top: 10px;
}
.CFBetter_setting_menu h4 {
    margin: 15px 0px 10px 0px;
}
.CFBetter_setting_menu h4,.CFBetter_setting_menu h5 {
    font-weight: 600;
}
.CFBetter_setting_menu hr {
    border: none;
    height: 1px;
    background-color: #ccc;
    margin: 10px 0;
}
.CFBetter_setting_menu .badge {
    border-radius: 4px;
    border: 1px solid #009688;
    color: #009688;
    font-size: 12px;
    padding: 0.5px 4px;
    margin-left: 5px;
    margin-right: auto;
}
/* 页面切换 */
.settings-page {
    display: none;
}
.settings-page.active {
    display: block;
}
.CFBetter_setting_container {
    display: flex;
}
.CFBetter_setting_sidebar {
    width: 110px;
    padding: 6px 10px 6px 6px;
    margin: 20px 0px;
    border-right: 1px solid #d4d8e9;
}
.CFBetter_setting_content {
    flex-grow: 1;
    width: 360px;
    margin: 20px 0px 0px 20px;
    padding-right: 10px;
    max-height: 580px;
    overflow-y: auto;
    box-sizing: border-box;
}
.CFBetter_setting_sidebar h3 {
    margin-top: 0;
}
.CFBetter_setting_sidebar hr {
    margin-top: 10px;
    margin-bottom: 10px;
    border: none;
    border-top: 1px solid #DADCE0;
}
.CFBetter_setting_sidebar ul {
    list-style-type: none;
    margin: 0;
    padding: 0;
}
.CFBetter_setting_sidebar li {
    margin: 5px 0px;
    background-color: #ffffff;
    border: 1px solid #d4d8e9;
    border-radius: 4px;
    font-size: 16px;
}
.CFBetter_setting_sidebar li a {
    text-decoration: none;
    display: flex;
    width: 100%;
    color: gray;
    letter-spacing: 2px;
    padding: 7px;
    border-radius: 4px;
    align-items: center;
    -webkit-box-sizing: border-box;
    -moz-box-sizing: border-box;
    box-sizing: border-box;
}
.CFBetter_setting_sidebar li a.active {
    background-color: #eceff1c7;
}
/* 下拉选择框 */
.CFBetter_setting_menu select {
    appearance: none;
    padding: 5px 10px;
    margin: -5px 0px;
    border-radius: 6px;
    border-style: solid;
    border: 1px solid #ced4da;
    color: #009688;
    font-size: 15px;
}
.CFBetter_setting_menu select:focus-visible {
    outline: none;
}
/* 数值输入框 */
.CFBetter_setting_menu input[type="number"] {
    width: 40px;
    color: #009688;
    font-size: 15px;
    appearance: none;
    padding: 5px 10px;
    margin: -5px 3px;
    border-radius: 6px;
    border-style: solid;
    border: 1px solid #ced4da;
}
.CFBetter_setting_menu input[type="number"]:focus-visible {
    outline: none;
}
.CFBetter_setting_menu input[type="number"]::-webkit-inner-spin-button,
.CFBetter_setting_menu input[type="number"]::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
}
/*设置面板-滚动条*/
.CFBetter_setting_menu::-webkit-scrollbar, .CFBetter_setting_content::-webkit-scrollbar {
    width: 5px;
    height: 7px;
    background-color: #aaa;
}
.CFBetter_setting_menu::-webkit-scrollbar-thumb, .CFBetter_setting_content::-webkit-scrollbar-thumb {
    background-clip: padding-box;
    background-color: #d7d9e4;
}
.CFBetter_setting_menu::-webkit-scrollbar-track, .CFBetter_setting_content::-webkit-scrollbar-track {
    background-color: #f1f1f1;
}
/*设置面板-关闭按钮*/
.CFBetter_setting_menu .tool-box {
    position: absolute;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    overflow: hidden;
    border-radius: 10px;
    top: 3px;
    right: 3px;
}

.CFBetter_setting_menu .btn-close {
    display: flex;
    text-align: center;
    width: 20px;
    height: 20px;
    color: transparent;
    font-size: 0;
    cursor: pointer;
    background-color: #ff000080;
    border: none;
    margin: 0px;
    padding: 0px;
    overflow: hidden;
    transition: .15s ease all;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
}

.CFBetter_setting_menu .btn-close:hover {
    width: 20px;
    height: 20px !important;
    font-size: 17px;
    color: #ffffff;
    background-color: #ff0000cc;
    box-shadow: 0 5px 5px 0 #00000026;
}

.CFBetter_setting_menu .btn-close:active {
    width: 20px;
    height: 20px;
    font-size: 1px;
    color: #ffffffde;
    --shadow-btn-close: 0 3px 3px 0 #00000026;
    box-shadow: var(--shadow-btn-close);
}

/*设置面板-checkbox*/
.CFBetter_setting_menu input[type=checkbox]:focus {
    outline: 0px;
}

.CFBetter_setting_menu input[type="checkbox"] {
    margin: 0px;
	appearance: none;
    -webkit-appearance: none;
	width: 40px;
	height: 20px !important;
	border: 1.5px solid #D7CCC8;
    padding: 0px !important;
	border-radius: 20px;
	background: #efebe978;
	position: relative;
	box-sizing: border-box;
}

.CFBetter_setting_menu input[type="checkbox"]::before {
	content: "";
	width: 14px;
	height: 14px;
	background: #D7CCC8;
	border: 1.5px solid #BCAAA4;
	border-radius: 50%;
	position: absolute;
	top: 0;
	left: 0;
	transform: translate(2%, 2%);
	transition: all 0.3s ease-in-out;
}

.CFBetter_setting_menu input[type="checkbox"]::after {
	content: url("data:image/svg+xml,%3Csvg xmlns='://www.w3.org/2000/svg' width='23' height='23' viewBox='0 0 23 23' fill='none'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M6.55021 5.84315L17.1568 16.4498L16.4497 17.1569L5.84311 6.55026L6.55021 5.84315Z' fill='%23EA0707' fill-opacity='0.89'/%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M17.1567 6.55021L6.55012 17.1568L5.84302 16.4497L16.4496 5.84311L17.1567 6.55021Z' fill='%23EA0707' fill-opacity='0.89'/%3E%3C/svg%3E");
	position: absolute;
	top: 0;
	left: 24px;
}

.CFBetter_setting_menu input[type="checkbox"]:checked {
	border: 1.5px solid #C5CAE9;
	background: #E8EAF6;
}

.CFBetter_setting_menu input[type="checkbox"]:checked::before {
	background: #C5CAE9;
	border: 1.5px solid #7986CB;
	transform: translate(122%, 2%);
	transition: all 0.3s ease-in-out;
}

.CFBetter_setting_menu input[type="checkbox"]:checked::after {
    content: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 15 13' fill='none'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M14.8185 0.114533C15.0314 0.290403 15.0614 0.605559 14.8855 0.818454L5.00187 12.5L0.113036 6.81663C-0.0618274 6.60291 -0.0303263 6.2879 0.183396 6.11304C0.397119 5.93817 0.71213 5.96967 0.886994 6.18339L5.00187 11L14.1145 0.181573C14.2904 -0.0313222 14.6056 -0.0613371 14.8185 0.114533Z' fill='%2303A9F4' fill-opacity='0.9'/%3E%3C/svg%3E");
    position: absolute;
    top: 1.5px;
    left: 4.5px;
}

.CFBetter_setting_menu label, #darkMode_span, #loaded_span {
    font-size: 16px;
}

.CFBetter_setting_list {
    display: flex;
    align-items: center;
    padding: 10px;
    margin: 5px 0px;
    background-color: #ffffff;
    border-bottom: 1px solid #c9c6c696;
    border-radius: 8px;
    justify-content: space-between;
}

/*设置面板-radio*/
.CFBetter_setting_menu #translation-settings label {
    list-style-type: none;
    padding-inline-start: 0px;
    overflow-x: auto;
    max-width: 100%;
    margin: 3px 0px;
}

.CFBetter_setting_menu_label_text {
    display: flex;
    border: 1px dashed #00aeeccc;
    height: 35px;
    width: 100%;
    color: #6e6e6e;
    font-weight: 300;
    font-size: 14px;
    letter-spacing: 2px;
    padding: 7px;
    margin-bottom: 4px;
    align-items: center;
    -webkit-box-sizing: border-box;
    -moz-box-sizing: border-box;
    box-sizing: border-box;
}

input[type="radio"]:checked+.CFBetter_setting_menu_label_text {
    background: #41e49930;
    border: 1px solid green;
    color: green;
    text-shadow: 0px 0px 0.5px green;
}

.CFBetter_setting_menu label input[type="radio"], .CFBetter_contextmenu label input[type="radio"]{
    appearance: none;
    list-style: none;
    padding: 0px !important;
    margin: 0px;
    clip: rect(0 0 0 0);
    -webkit-clip-path: inset(100%);
    clip-path: inset(100%);
    height: 1px;
    overflow: hidden;
    position: absolute;
    white-space: nowrap;
    width: 1px;
}

.CFBetter_setting_menu input[type="text"] {
    display: block;
    height: 25px !important;
    width: 100%;
    background-color: #ffffff;
    color: #727378;
    font-size: 12px;
    border-radius: 0.3rem;
    padding: 1px 5px !important;
    box-sizing: border-box;
    margin: 5px 0px 5px 0px;
    border: 1px solid #00aeeccc;
    box-shadow: 0 0 1px #0000004d;
}

.CFBetter_setting_menu .CFBetter_setting_list input[type="text"] {
    margin-left: 5px;
}

.CFBetter_setting_menu input[type="text"]:focus-visible{
    border-style: solid;
    border-color: #3f51b5;
    outline: none;
}

.CFBetter_setting_menu_input {
    width: 100%;
    display: grid;
    margin-top: 5px;
    -webkit-box-sizing: border-box;
    -moz-box-sizing: border-box;
    box-sizing: border-box;
}
.CFBetter_setting_menu input::placeholder {
    color: #727378;
}
.CFBetter_setting_menu input.no_default::placeholder{
    color: #BDBDBD;
}
.CFBetter_setting_menu input.is_null::placeholder{
    color: red;
    border-width: 1.5px;
}
.CFBetter_setting_menu input.is_null{
    border-color: red;
}
.CFBetter_setting_menu textarea {
    display: block;
    width: 100%;
    height: 60px;
    background-color: #ffffff;
    color: #727378;
    font-size: 12px;
    padding: 1px 5px !important;
    box-sizing: border-box;
    margin: 5px 0px 5px 0px;
    border: 1px solid #00aeeccc;
    box-shadow: 0 0 1px #0000004d;
}
.CFBetter_setting_menu textarea:focus-visible{
    border-style: solid;
    border-color: #3f51b5;
    outline: none;
}
.CFBetter_setting_menu textarea::placeholder{
    color: #BDBDBD;
    font-size: 14px;
}

.CFBetter_setting_menu #save {
    cursor: pointer;
	display: inline-flex;
    padding: 5px;
	background-color: #1aa06d;
	color: #ffffff;
	font-size: 14px;
	line-height: 1.5rem;
	font-weight: 500;
	justify-content: center;
	width: 100%;
	border-radius: 0.375rem;
	border: none;
	box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    margin-top: 20px
}
.CFBetter_setting_menu button#debug_button.debug_button {
    width: 18%;
}

.CFBetter_setting_menu span.tip {
    color: #999;
    font-size: 12px;
    font-weight: 500;
    padding: 5px 0px;
}
/*设置面板-tip*/
.help_tip {
    margin-right: auto;
}
span.input_label {
    font-size: 14px;
}
.help_tip .tip_text {
    display: none;
    position: absolute;
    color: #697e91;
    font-weight: 400;
    font-size: 14px;
    letter-spacing: 0px;
    background-color: #ffffff;
    padding: 10px;
    margin: 5px 0px;
    border-radius: 4px;
    border: 1px solid #e4e7ed;
    box-shadow: 0px 0px 12px rgba(0, 0, 0, .12);
    z-index: 100;
}
.help_tip .tip_text p {
    margin-bottom: 5px;
}
.help_tip .tip_text:before {
    content: "";
    position: absolute;
    top: -20px;
    right: -10px;
    bottom: -10px;
    left: -10px;
    z-index: -1;
}
.help-icon {
    cursor: help;
    width: 15px;
    color: #b4b9d4;
    margin-left: 5px;
    margin-top: 3px;
}
.CFBetter_setting_menu .CFBetter_setting_menu_label_text .help_tip .help-icon {
    color: #7fbeb2;
}
.help_tip .help-icon:hover + .tip_text, .help_tip .tip_text:hover {
    display: block;
    cursor: help;
    width: 250px;
}

/*确认弹窗*/
.CFBetter_modal {
    z-index: 600;
    display: grid;
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 12px;
    font-family: var(--vp-font-family-base);
    padding: 10px 20px;
    box-shadow: 0px 0px 0px 4px #ffffff;
    border-radius: 6px;
    background-color: #f0f4f9;
    border-collapse: collapse;
    border: 1px solid #ffffff;
    color: #697e91;
}
.CFBetter_modal .buttons{
    display: flex;
    padding-top: 15px;
}
.CFBetter_modal button {
    display: inline-flex;
    justify-content: center;
    align-items: center;
    line-height: 1;
    white-space: nowrap;
    cursor: pointer;
    text-align: center;
    box-sizing: border-box;
    outline: none;
    transition: .1s;
    user-select: none;
    vertical-align: middle;
    -webkit-appearance: none;
    height: 24px;
    padding: 5px 11px;
    margin-right: 15px;
    font-size: 12px;
    border-radius: 4px;
    color: #ffffff;
    background: #009688;
    border-color: #009688;
    border: none;
}
.CFBetter_modal button#cancelButton{
    background-color:#4DB6AC;
}
.CFBetter_modal button:hover{
    background-color:#4DB6AC;
}
.CFBetter_modal button#cancelButton:hover {
    background-color: #80CBC4;
}
.CFBetter_modal .help-icon {
    margin: 0px 8px 0px 0px;
    height: 1em;
    width: 1em;
    line-height: 1em;
    display: inline-flex;
    justify-content: center;
    align-items: center;
    position: relative;
    fill: currentColor;
    font-size: inherit;
}
.CFBetter_modal p {
    margin: 5px 0px;
}
/*更新检查*/
div#update_panel {
    z-index: 200;
    position: fixed;
    top: 50%;
    left: 50%;
    width: 240px;
    transform: translate(-50%, -50%);
    box-shadow: 0px 0px 4px 0px #0000004d;
    padding: 10px 20px 20px 20px;
    color: #444242;
    background-color: #f5f5f5;
    border: 1px solid #848484;
    border-radius: 8px;
}
div#update_panel #updating {
    cursor: pointer;
	display: inline-flex;
	padding: 3px;
	background-color: #1aa06d;
	color: #ffffff;
	font-size: 14px;
	line-height: 1.5rem;
	font-weight: 500;
	justify-content: center;
	width: 100%;
	border-radius: 0.375rem;
	border: none;
	box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}
div#update_panel #updating a {
    text-decoration: none;
    color: white;
    display: flex;
    position: inherit;
    top: 0;
    left: 0;
    width: 100%;
    height: 22px;
    font-size: 14px;
    justify-content: center;
    align-items: center;
}
#skip_menu {
    display: flex;
    margin-top: 10px;
    justify-content: flex-end;
    align-items: center;
}
#skip_menu .help_tip {
    margin-right: 5px;
    margin-left: -5px;
}
#skip_menu .help-icon {
    color: #f44336;
}
/* 配置管理 */
.embed-responsive {
    height: max-content;
    padding-bottom: 0px;
}
.config_bar {
    height: 70px;
    width: 100%;
    display: flex;
    justify-content: space-between;
}
li#add_button {
    cursor: pointer;
    height: 40px;
    border: 1px dashed #BDBDBD;
    border-radius: 8px;
    background-color: #fcfbfb36;
    color: #bdbdbd;
    font-size: 14px;
    align-items: center;
    justify-content: center;
}
li#add_button:hover {
    border: 1px dashed #03A9F4;
    background-color: #d7f0fb8c;
    color: #03A9F4;
}
div#config_bar_list {
    display: flex;
    width: 335px;
    border: 1px solid #c5cae9;
    border-radius: 8px;
    background-color: #f0f8ff;
    box-sizing: border-box;
}
div#config_bar_list input[type="radio"] {
    appearance: none;
    width: 0;
    height: 0;
    overflow: hidden;
}
div#config_bar_list input[type="radio"] {
    margin: 0px;
}
div#config_bar_list input[type=radio]:focus {
    outline: 0px;
}
label.config_bar_ul_li_text {
    display: flex;
    align-items: center;
    justify-content: center;
    max-width: 100%;
    height: 40px;
    overflow-x: auto;
    font-size: 14px;
    font-weight: 400;
    margin: 0px 4px;
    padding: 3px;
    border: 1px solid #dedede;
    border-radius: 10px;
    box-shadow: 0px 2px 4px 0px rgba(0,0,0,.05);
    box-sizing: border-box;
}
ul#config_bar_ul li button {
    background-color: #e6e6e6;
    color: #727378;
    height: 23px;
    font-size: 14px;
    border-radius: 0.3rem;
    padding: 1px 5px;
    margin: 5px;
    border: none;
    box-shadow: 0 0 1px #0000004d;
}
ul#config_bar_ul {
    display: flex;
    align-items: center;
    list-style-type: none;
    padding-inline-start: 0px;
    overflow-x: auto;
    max-width: 100%;
    margin: 0px;
}
ul#config_bar_ul li {
    width: 80px;
    display: grid;
    margin: 4px 4px;
    min-width: 100px;
    box-sizing: border-box;
}
label.config_bar_ul_li_text:hover {
    background-color: #eae4dc24;
}
input[type="radio"]:checked + .config_bar_ul_li_text {
    background: #41b3e430;
    border: 1px solid #5e7ce0;
    color: #5e7ce0;
}
ul#config_bar_ul::-webkit-scrollbar {
    width: 5px;
    height: 3px;
}
ul#config_bar_ul::-webkit-scrollbar-thumb {
    background-clip: padding-box;
    background-color: #d7d9e4;
    border-radius: 8px;
}
ul#config_bar_ul::-webkit-scrollbar-button:start:decrement {
    width: 4px;
    background-color: transparent;
}
ul#config_bar_ul::-webkit-scrollbar-button:end:increment {
    width: 4px;
    background-color: transparent;
}
ul#config_bar_ul::-webkit-scrollbar-track {
    border-radius: 5px;
}
label.config_bar_ul_li_text::-webkit-scrollbar {
    width: 5px;
    height: 7px;
    background-color: #aaa;
}
label.config_bar_ul_li_text::-webkit-scrollbar-thumb {
    background-clip: padding-box;
    background-color: #d7d9e4;
}
label.config_bar_ul_li_text::-webkit-scrollbar-track {
    background-color: #f1f1f1;
}
.config_bar_list_add_div {
    display: flex;
    height: 40px;
    margin: 4px 2px;
}
/* 修改菜单 */
div#config_bar_menu {
    z-index: 400;
    position: absolute;
    width: 60px;
    background: #ffffff;
    box-shadow: 1px 1px 4px 0px #0000004d;
    border: 0px solid rgba(0,0,0,0.04);
    border-radius: 4px;
    padding: 8px 0;
}
div.config_bar_menu_item {
    cursor: pointer;
    padding: 2px 6px;
    display: flex;
    justify-content: center;
    align-items: center;
    height: 32px;
    color: rgba(0,0,0,0.75);
    font-size: 14px;
    font-weight: 500;
    box-shadow: inset 0px 0px 0px 0px #8bb2d9;
}
div#config_bar_menu_edit:hover {
    background-color: #00aeec;
    color: white;
}
div#config_bar_menu_delete:hover {
    background-color: #FF5722;
    color: white;
}
/* 配置页面 */
#config_edit_menu {
    z-index: 300;
    width: 450px;
}
/* 黑暗模式选项 */
.dark-mode-selection {
    display: flex;
    justify-content: center;
    align-items: center;
    max-width: 350px;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
}
.dark-mode-selection > * {
    margin: 6px;
}
.dark-mode-selection .CFBetter_setting_menu_label_text {
    border-radius: 8px;
}
/* 右键菜单 */
.CFBetter_contextmenu {
    z-index: 500;
    display: grid;
    position: absolute;
    background-color: #f0f4f9;
    border-collapse: collapse;
    color: #697e91;
    font-family: var(--vp-font-family-base);
    overflow: hidden;
    box-sizing: content-box;
    box-shadow: 0px 0px 0px 2px #eddbdb4d;
}
input[type="radio"]:checked+.CFBetter_contextmenu_label_text {
    background: #41e49930;
    border: 1px solid green;
    color: green;
    font-weight: 500;
}
.CFBetter_contextmenu_label_text {
    display: flex;
    border: 1px dashed #80cbc4;
    height: 26px;
    width: 100%;
    color: gray;
    font-size: 13px;
    padding: 4px;
    align-items: center;
    -webkit-box-sizing: border-box;
    -moz-box-sizing: border-box;
    box-sizing: border-box;
}
.CFBetter_contextmenu_label_text:hover {
    color: #F44336;
    border: 1px dashed #009688;
    background-color: #ffebcd;
}
/* RatingByClist */
.ratingBadges, html[data-theme=dark] button.ratingBadges{
    font-weight: 700;
    margin-top: 5px;
    border-radius: 4px;
    color: #ffffff00;
    border: 1px solid #cccccc66;
}
/* 多选翻译 */
.block_selected{
    box-shadow: 0px 0px 0px 1px #FF9800;
    outline: none;
}
/* 悬浮菜单 */
.CFBetter_MiniTranslateButton {
    z-index: 100;
    display: grid;
    position: absolute;
    border-collapse: collapse;
    fill: #F57C00;
    background-color: #FFF3E0;
    overflow: hidden;
    box-sizing: content-box;
    box-shadow: 0px 0px 0px 2px #FFE0B2;
    border-radius: 100%;
}
.CFBetter_MiniTranslateButton:hover {
    cursor: pointer;
    box-shadow: 0px 0px 0px 2px #FFB74D;
}
/* acmsguru划分块 */
.CFBetter_acmsguru {
    margin: 0 0 1em!important;
}
/* 整个代码提交表单 */
#CFBetter_SubmitForm input[type="number"] {
    width: 40px;
    color: #009688;
    appearance: none;
    padding: 5px 10px;
    border-radius: 6px;
    border-style: solid;
    border: 1px solid #ced4da;
}
#CFBetter_SubmitForm :focus-visible {
    outline: none;
    border: 1px solid #9E9E9E !important;
}
/* 代码编辑 */
#CFBetter_editor{
    box-sizing: border-box;
    height: 370px;
    border: 1px solid #d3d3d3;
    width: 100% !important;
    display: block;
    resize: vertical;
}
#CFBetter_submitDiv{
    display: flex;
    justify-content: space-between;
    padding-top: 15px;
}
.CFBetter_SubmitButton {
    cursor: pointer;
    font-size: 15px;
    height: 35px;
    width: 100px;
    margin-left: 10px;
    border-radius: 6px;
    border: 1px solid #3c9a5f;
}
#RunTestButton {
    color: #333;
    background-color: #fff;
    border-color: #ccc;
}
#RunTestButton:hover {
    background-color: #f5f5f5;
}
#SubmitButton {
    color: #fff;
    background-color: #209978;
    border-color: #17795E;
}
#SubmitButton:hover {
    background-color: #17795e;
}
#SubmitButton.disabled {
    background-color: red;
    animation: shake 0.07s infinite alternate;
}
@keyframes shake {
    0% { transform: translateX(-5px); }
    100% { transform: translateX(5px); }
}
#programTypeId{
    padding: 5px 10px;
    border-radius: 6px;
    border-style: solid;
    border: 1px solid #ced4da;
    color: #212529;
}
/* 调试 */
.CFBetter_loding{
    padding: 6px 0px 0px 5px;
    height: 22px;
}
#CompilerSetting{
    width: 70%;
}
#CompilerSetting select, #CompilerSetting textarea{
    padding: 4px 10px;
    border-radius: 6px;
    border-style: solid;
    border: 1px solid #ced4da;
    color: #212529;
}
#CompilerArgsInput{
    width: 100%;
    height: 35px;
    margin-bottom: 10px;
    padding: 5px 10px;
    border-radius: 6px;
    box-sizing: border-box;
    border: 1px solid #ccc;
    box-shadow: inset 0px 1px 1px rgba(0,0,0,.075);
}
input#CompilerArgsInput[disabled] {
    cursor: not-allowed;
}
#CompilerBox{
    display: grid;
    margin-top: 10px;
    border: #d0d7de solid 1px;
    border-radius: 6px;
}
#CompilerBox > * {  
    margin: 5px;
}

/* 调试结果 */
#statePanel{
    padding: 10px;
    margin-top: 10px;
    border: 1px solid #ddd;
    border-radius: 4px;
}
.RunState_title:not(:first-child){
    margin-top: 20px;
}
.RunState_title{
    font-size: 16px;
    margin-bottom: 8px;
}
.RunState_title.error{
    color: red;
}
.RunState_title.ok{
    color: #449d44;
}
/* 自定义样例 */
#customTestBlock {
    margin-top: 10px;
    color: #616161;
    border: 1px solid #d3d3d3;
    box-sizing: border-box;
    position: relative;
}

#customTestBlock #customTests{
    border-top: 1px solid #d3d3d3;
    margin: 0px 0px 40px 0px;
}

#customTestBlock summary {
    cursor: pointer;
    padding: 10px;
}

#customTestBlock textarea {
    resize: vertical;
}

.sampleDiv {
    color: #727378;
    background-color: #FAFAFA;
    padding: 5px;
    margin-bottom: 10px;
    box-shadow: inset 0 0 1px #0000004d;
    position: relative;
}

.dynamicTextarea {
    width: 98%;
    height: 120px;
    margin: 10px 5px;
    border: 1px solid #E0E0E0;
}

.deleteCustomTest {
    cursor: pointer;
    position: absolute;
    top: 5px;
    right: 5px;
    display: flex;
    fill: #9E9E9E;
    padding: 2px 2px;
    border-radius: 4px;
    border: 1px solid #ffffff00;
    background-color: #ffffff00;
    align-items: center;
}

.deleteCustomTest:hover {
    fill: #EF5350;
    border: 1px solid #ef9a9a;
    background-color: #FFEBEE;
}

#addCustomTest {
    cursor: pointer;
    position: absolute;
    bottom: 5px;
    right: 5px;
    padding: 3px 10px;
    color: #795548;
    border: 1px solid #ccc;
    border-radius: 4px;
    background-color: #FAFAFA;
}
#addCustomTest:hover {
    background-color: #f5f5f5;
}
/* 差异对比 */
.outputDiff {
    color: #5d4037;
    margin: 5px 0px;
    display: grid;
    border: 1px solid #bcaaa4;
    font-size: 13px;
    font-family: Consolas, "Lucida Console", "Andale Mono", "Bitstream Vera Sans Mono", "Courier New", Courier, monospace;
}

.outputDiff .added {
    background-color: #c8f7c5;
    user-select: none;
}

.outputDiff .removed {
    background-color: #f7c5c5;
}

.DiffLine {
    display: flex;

}

.outputDiff .DiffLine:nth-child(odd) {
    background-color: #f5f5f5;
}

.LineNo {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 17px;
    color: #BDBDBD;
    font-size: 10px;
    border-right: 1px solid;
    user-select: none;
}

.LineContent {
    display: grid;
    width: 100%;
}
/* 移动设备 */
@media (max-device-width: 450px) {
    button.html2mdButton{
        height: 2em;
        font-size: 1.2em;
    }
    button.html2mdButton.CFBetter_setting{
        height: 2.5em;
        font-size: 1em;
    }
    .CFBetter_setting_menu{
        width: 90%;
    }
    .CFBetter_setting_menu label, #darkMode_span, #loaded_span, .CFBetter_setting_menu_label_text,
    .CFBetter_setting_sidebar li{
        font-size: 1em;
    }
    .translate-problem-statement{
        font-size: 1.2em;
    }
    .CFBetter_modal{
        font-size: 1.5em;
    }
    .CFBetter_setting_list, .translate-problem-statement{
        padding: 0.5em;
    }
    .CFBetter_setting_menu_label_text{
        height: 2.5em;
        padding: 0.5em;
    }
    #pagBar #jump-input, #pagBar #items-per-page, .CFBetter_modal button{
        height: 2.5em;
        font-size: 1em;
    }
    .translate-problem-statement p, .translate-problem-statement ul li{
        line-height: 1.5em !important;
    }
    .CFBetter_contextmenu_label_text{
        height: 3em;
        font-size: 1em;
    }
}
`);

// 工具
// 获取cookie
function getCookie(name) {
    const cookies = document.cookie.split(";");
    for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        const [cookieName, cookieValue] = cookie.split("=");

        if (cookieName === name) {
            return decodeURIComponent(cookieValue);
        }
    }
    return "";
}

// 随机数生成
function getRandomNumber(numDigits) {
    let min = Math.pow(10, numDigits - 1);
    let max = Math.pow(10, numDigits) - 1;
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 防抖函数
function debounce(callback) {
    let timer;
    let immediateExecuted = false;
    const delay = 500;
    return function() {
        clearTimeout(timer);
        if (!immediateExecuted) { callback.call(this); immediateExecuted = true; }
        timer = setTimeout(() => { immediateExecuted = false; }, delay);
    };
}

// 为元素添加鼠标拖动
function addDraggable(element) {
    let isDragging = false;
    let initialX, initialY; // 元素的初始位置
    let startX, startY, offsetX, offsetY; // 鼠标起始位置，移动偏移量
    let isSpecialMouseDown = false; // 选取某些元素时不拖动

    element.on('mousedown', function(e) {
        var elem = $(this);
        var elemOffset = elem.offset();
        var centerX = elemOffset.left + elem.outerWidth() / 2;
        var centerY = elemOffset.top + elem.outerHeight() / 2;
        initialX = centerX - window.pageXOffset;
        initialY = centerY - window.pageYOffset;

        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;

        isSpecialMouseDown = $(e.target).is('label, p, input, textarea, span, select');
        if (isSpecialMouseDown) return;
        $('body').css('cursor', 'all-scroll');
    });

    $(document).on('mousemove', function(e) {
        if (!isDragging) return;
        // 不执行拖动操作
        if ($(e.target).is('label, p, input, textarea, span') || isSpecialMouseDown && !$(e.target).is('input, textarea')) return;
        e.preventDefault();
        offsetX = e.clientX - startX;
        offsetY = e.clientY - startY;
        element.css({ top: initialY + offsetY + 'px', left: initialX + offsetX + 'px' });
    });

    $(document).on('mouseup', function() {
        isDragging = false;
        isSpecialMouseDown = false;
        $('body').css('cursor', 'default');
    });
}

// 更新检查
function checkScriptVersion() {
    function compareVersions(version1 = "0", version2 = "0") {
        const v1Array = String(version1).split(".");
        const v2Array = String(version2).split(".");
        const minLength = Math.min(v1Array.length, v2Array.length);
        let result = 0;
        for (let i = 0; i < minLength; i++) {
            const curV1 = Number(v1Array[i]);
            const curV2 = Number(v2Array[i]);
            if (curV1 > curV2) {
                result = 1;
                break;
            } else if (curV1 < curV2) {
                result = -1;
                break;
            }
        }
        if (result === 0 && v1Array.length !== v2Array.length) {
            const v1IsBigger = v1Array.length > v2Array.length;
            const maxLenArray = v1IsBigger ? v1Array : v2Array;
            for (let i = minLength; i < maxLenArray.length; i++) {
                const curVersion = Number(maxLenArray[i]);
                if (curVersion > 0) {
                    v1IsBigger ? result = 1 : result = -1;
                    break;
                }
            }
        }
        return result;
    }

    GM_xmlhttpRequest({
        method: "GET",
        url: "https://greasyfork.org/zh-CN/scripts/465777.json",
        timeout: 10 * 1e3,
        onload: function(response) {
            const scriptData = JSON.parse(response.responseText);
            const skipUpdate = getCookie("skipUpdate");

            if (
                scriptData.name === GM_info.script.name &&
                compareVersions(scriptData.version, GM_info.script.version) === 1 &&
                skipUpdate !== "true"
            ) {
                const styleElement = GM_addStyle(darkenPageStyle);
                $("body").append(`
                    <div id='update_panel'>
                        <h3>${GM_info.script.name}有新版本！</h3>
                        <hr>
                        <div class='update_panel_menu'>
                            <span class ='tip'>版本信息：${GM_info.script.version} → ${scriptData.version}</span>
                        </div>
                        <br>
                        <div id="skip_menu">
                            <div class="help_tip">
                                ${helpCircleHTML}
                                <div class="tip_text">
                                    <p><b>更新遇到了问题？</b></p>
                                    <p>由于 Greasyfork 平台的原因，当新版本刚发布时，点击 Greasyfork 上的更新按钮<u>可能</u>会出现<u>实际更新/安装的却是上一个版本</u>的情况</p>
                                    <p>通常你只需要稍等几分钟，然后再次前往更新/安装即可</p>
                                    <p>你也可以<u>点击下方按钮，在本次浏览器会话期间将不再提示更新</u></p>
                                    <button id='skip_update' class='html2mdButton'>暂不更新</button>
                                </div>
                            </div>
                            <button id='updating'><a target="_blank" href="${scriptData.url}">更新</a></button>
                        </div>
                    </div>
                `);

                $("#skip_update").click(function() {
                    document.cookie = "skipUpdate=true; expires=session; path=/";
                    styleElement.remove();
                    $("#update_panel").remove();
                });
            }
        }
    });

};

// 汉化替换
function toZH_CN() {
    if (!bottomZh_CN) return;
    // 设置语言为zh
    var htmlTag = document.getElementsByTagName("html")[0];
    htmlTag.setAttribute("lang", "zh-CN");

    // 文本节点遍历替换
    function traverseTextNodes(node, rules) {
        if (!node) return;
        if (node.nodeType === Node.TEXT_NODE) {
            rules.forEach(rule => {
                const regex = new RegExp(rule.match, 'g');
                node.textContent = node.textContent.replace(regex, rule.replace);
            });
        } else {
            $(node).contents().each((_, child) => traverseTextNodes(child, rules));
        }
    }

    // 严格
    function strictTraverseTextNodes(node, rules) {
        if (!node) return;
        if (node.nodeType === Node.TEXT_NODE) {
            const nodeText = node.textContent.trim();
            rules.forEach(rule => {
                if (nodeText === rule.match) {
                    node.textContent = rule.replace;
                }
            });
        } else {
            $(node).contents().each((_, child) => strictTraverseTextNodes(child, rules));
        }
    }

    const rules1 = [
        { match: 'Virtual participation', replace: '参加虚拟重现赛' },
        { match: 'Enter', replace: '进入' },
        { match: 'Current standings', replace: '当前榜单' },
        { match: 'Final standings', replace: '最终榜单' },
        { match: 'Preliminary results', replace: '初步结果' },
        { match: 'open hacking:', replace: '公开黑客攻击中' },
        { match: 'School/University/City/Region Championship', replace: '学校/大学/城市/区域比赛' },
        { match: 'Official School Contest', replace: '学校官方比赛' },
        { match: 'Training Contest', replace: '训练赛' },
        { match: 'Training Camp Contest', replace: '训练营比赛' },
        { match: 'Official ICPC Contest', replace: 'ICPC官方比赛' },
        { match: 'Official International Personal Contest', replace: '官方国际个人赛' },
        { match: 'China', replace: '中国' },
        { match: 'Statements', replace: '题目描述' },
        { match: 'in Chinese', replace: '中文' },
        { match: 'Trainings', replace: '训练' },
        { match: 'Prepared by', replace: '编写人' },
        { match: 'Current or upcoming contests', replace: '当前或即将举行的比赛' },
        { match: 'Rating: users participated in recent 6 months', replace: '评级：最近 6 个月有参与的用户' },
        { match: 'Past contests', replace: '过去的比赛' },
        { match: 'Exclusions', replace: '排除' },
        { match: 'Before start', replace: '距比赛开始还有' },
        { match: 'Before registration', replace: '距报名开始还有' },
        { match: 'Until closing ', replace: '距报名结束还有' },
        { match: 'Before extra registration', replace: '额外报名还未开始' },
        { match: 'Register »', replace: '报名 »' },
        { match: 'Registration completed', replace: '已报名' },
        { match: 'Registration closed', replace: '报名已结束' },
        { match: 'Problems', replace: '问题集' },
        { match: 'Questions about problems', replace: '关于问题的提问' },
        { match: 'Contest status', replace: '比赛状态' },
    ];
    traverseTextNodes($('.datatable'), rules1);

    const rules2 = [
        { match: 'Home', replace: '主页' },
        { match: 'Top', replace: '热门' },
        { match: 'Catalog', replace: '指南目录' },
        { match: 'Contests', replace: '比赛' },
        { match: 'Gym', replace: '训练营' },
        { match: 'Problemset', replace: '题单' },
        { match: 'Groups', replace: '团体' },
        { match: 'Rating', replace: 'Rating(评级)排行榜' },
        { match: 'Edu', replace: '培训' },
        { match: 'Calendar', replace: '日历' },
        { match: 'Help', replace: '帮助' }
    ];
    traverseTextNodes($('.menu-list.main-menu-list'), rules2);

    const rules3 = [
        { match: 'Settings', replace: '设置' },
        { match: 'Blog', replace: '博客' },
        { match: 'Teams', replace: '队伍' },
        { match: 'Submissions', replace: '提交' },
        { match: 'Favourites', replace: '收藏' },
        { match: 'Talks', replace: '私信' },
        { match: 'Contests', replace: '比赛' },
    ];
    traverseTextNodes($('.nav-links'), rules3);

    const rules4 = [
        { match: 'Before contest', replace: '即将进行的比赛' },
        { match: 'Contest is running', replace: '比赛进行中' },
    ];
    traverseTextNodes($('.contest-state-phase'), rules4);

    const rules5 = [
        { match: 'has extra registration', replace: '有额外的报名时期' },
        { match: 'If you are late to register in 5 minutes before the start, you can register later during the extra registration. Extra registration opens 10 minutes after the contest starts and lasts 25 minutes.', replace: '如果您在比赛开始前5分钟前还未报名，您可以在额外的报名期间稍后报名。额外的报名将在比赛开始后10分钟开放，并持续25分钟。' },
    ];
    traverseTextNodes($('.notice'), rules5);

    const rules6 = [
        { match: 'Contribution', replace: '贡献' },
    ];
    traverseTextNodes($('.propertyLinks'), rules6);

    const rules7 = [
        { match: 'Contest history', replace: '比赛历史' },
    ];
    traverseTextNodes($('.contests-table'), rules7);

    const rules8 = [
        { match: 'Register now', replace: '现在报名' },
        { match: 'No tag edit access', replace: '没有标签编辑权限' },
        { match: 'Language:', replace: '语言:' },
        { match: 'Choose file:', replace: '选择文件:' },
    ];
    traverseTextNodes($('.roundbox.sidebox.borderTopRound '), rules8);

    const rules9 = [
        { match: 'Add to exclusions', replace: '添加到排除列表' },
    ];
    traverseTextNodes($('.icon-eye-close.icon-large'), rules9);

    const rules10 = [
        { match: 'Add to exclusions for gym contests filter', replace: '添加训练营过滤器的排除项' },
    ];
    traverseTextNodes($("._ContestFilterExclusionsManageFrame_addExclusionLink"), rules10);

    const rules11 = [
        { match: 'Announcement', replace: '公告' },
        { match: 'Statements', replace: '统计报表' },
        { match: 'Tutorial', replace: '题解' },
    ];
    traverseTextNodes($('.roundbox.sidebox.sidebar-menu.borderTopRound '), rules11);

    const rules12 = [
        { match: 'Problems', replace: '问题' },
        { match: 'Submit Code', replace: '提交代码' },
        { match: 'My Submissions', replace: '我的提交' },
        { match: 'Status', replace: '状态' },
        { match: 'Standings', replace: '榜单' },
        { match: 'Custom Invocation', replace: '自定义调试' },
        { match: 'Common standings', replace: '全部排行' },
        { match: 'Friends standings', replace: '只看朋友' },
        { match: 'Submit', replace: '提交' },
        { match: 'Hacks', replace: '黑客' },
        { match: 'Room', replace: '房间' },
        { match: 'Custom test', replace: '自定义测试' },
        { match: 'Blog', replace: '博客' },
        { match: 'Teams', replace: '队伍' },
        { match: 'Submissions', replace: '提交记录' },
        { match: 'Groups', replace: '团体' },
        { match: 'Rating', replace: '评级' },
        { match: 'Friends rating', replace: '朋友的评级' },
        { match: 'Favourites', replace: '收藏' },
        { match: 'Contests', replace: '比赛' },
        { match: 'Members', replace: '成员' },
        { match: '问题etting', replace: '参与编写的问题' },
        { match: 'Streams', replace: '直播' },
        { match: 'Gym', replace: '训练营' },
        { match: 'Mashups', replace: '组合混搭' },
        { match: 'Posts', replace: '帖子' },
        { match: 'Comments', replace: '回复' },
        { match: 'Main', replace: '主要的' },
        { match: 'Settings', replace: '设置' },
        { match: 'Lists', replace: '列表' },
        { match: 'General', replace: '基本' },
        { match: 'Sidebar', replace: '侧边栏' },
        { match: 'Social', replace: '社会信息' },
        { match: 'Address', replace: '地址' },
        { match: 'Wallets', replace: '钱包' },
    ];
    traverseTextNodes($('.second-level-menu'), rules12);
    if (is_mSite) {
        traverseTextNodes($('nav'), rules12);
    }

    const rules13 = [
        { match: 'Expand', replace: '展开' }
    ];
    traverseTextNodes($('.topic-toggle-collapse'), rules13);

    const rules14 = [
        { match: 'Full text and comments', replace: '阅读全文/评论' }
    ];
    traverseTextNodes($('.topic-read-more'), rules14);

    const rules15 = [
        { match: 'Switch off editor', replace: '关闭编辑器语法高亮' }
    ];
    traverseTextNodes($('.toggleEditorCheckboxLabel'), rules15);

    const rules16 = [
        { match: 'Registration for the contest', replace: '比赛报名' }
    ];
    traverseTextNodes($('.submit'), rules16);

    const rules17 = [
        { match: 'Difficulty:', replace: '难度:' },
    ];
    traverseTextNodes($('._FilterByTagsFrame_difficulty'), rules17);

    const rules18 = [
        { match: 'Add tag', replace: '添加标签' }
    ];
    traverseTextNodes($('._FilterByTagsFrame_addTagLink'), rules18);

    const rules19 = [
        { match: 'Rating changes for last rounds are temporarily rolled back. They will be returned soon.', replace: '上一轮的评级变化暂时回滚。它们将很快恢复。' },
        { match: 'Reminder: in case of any technical issues, you can use the lightweight website', replace: '提醒：如果出现任何技术问题，您可以使用轻量网站' },
        { match: 'Please subscribe to the official Codeforces channel in Telegram via the link ', replace: '请通过链接订阅Codeforces的官方Telegram频道' }
    ];
    traverseTextNodes($('.alert'), rules19);

    const rules20 = [
        { match: 'Enter', replace: '登录' },
        { match: 'Register', replace: '注册' },
        { match: 'Contest rating', replace: '测试 rating' },
        { match: 'Logout', replace: '退出登录' }
    ];
    traverseTextNodes($('.lang-chooser'), rules20);

    const rules21 = [
        { match: 'Change photo', replace: '更换图片' },
        { match: 'Contest rating', replace: '比赛Rating' },
        { match: 'Contribution', replace: '贡献' },
        { match: 'My friends', replace: '我的好友' },
        { match: 'Change settings', replace: '改变设置' },
        { match: 'Last visit', replace: '最后访问' },
        { match: 'Registered', replace: '注册于' },
        { match: 'Blog entries', replace: '博客条目' },
        { match: 'comments', replace: '评论' },
        { match: 'Write new entry', replace: '编写新条目' },
        { match: 'View my talks', replace: '查看我的私信' },
        { match: 'Talks', replace: '私信' },
        { match: 'Send message', replace: '发送消息' },
    ];
    traverseTextNodes($('.userbox'), rules21);

    const rules22 = [
        { match: 'Reset', replace: '重置' },
    ];
    traverseTextNodes($('#vote-reset-filterDifficultyLowerBorder'), rules22);
    traverseTextNodes($('#vote-reset-filterDifficultyUpperBorder'), rules22);

    const rules23 = [
        { match: 'The problem statement has recently been changed.', replace: '题目描述最近已被更改。' },
        { match: 'View the changes.', replace: '查看更改' },
    ];
    traverseTextNodes($('.alert.alert-info'), rules23);

    const rules24 = [
        { match: 'Fill in the form to login into Codeforces.', replace: '填写表单以登录到Codeforces。' },
        { match: 'You can use', replace: '你也可以使用' },
        { match: 'as an alternative way to enter.', replace: '登录' },
    ];
    traverseTextNodes($('.enterPage'), rules24);

    const rules25 = [
        { match: '\\* To view the complete list, click ', replace: '* 要查看完整列表，请点击' },
    ];
    traverseTextNodes($('.notice.small'), rules25);

    const rules26 = [
        { match: 'Contest type:', replace: '比赛类型：' },
        { match: 'Rated:', replace: '已评级：' },
        { match: 'Tried:', replace: '已尝试' },
        { match: 'Substring:', replace: '关键字' },
    ];
    traverseTextNodes($('.setting-name'), rules26);

    const rules27 = [
        { match: 'Sort by:', replace: '排序依据：' },
        { match: 'relevance', replace: '相关' },
        { match: 'popularity', replace: '热度' },
        { match: 'time', replace: '时间' },
    ];
    traverseTextNodes($('.by-form'), rules27);

    // 元素选择替换
    // 侧栏titled汉化
    (function() {
        var translations = {
            "Pay attention": "→ 注意",
            "Top rated": "→ 评级排行",
            "Top contributors": "→ 贡献者排行",
            "Find user": "→ 查找用户",
            "Recent actions": "→ 最新动态",
            "Training filter": "→ 过滤筛选",
            "Find training": "→ 搜索比赛/问题",
            "Virtual participation": "→ 什么是虚拟参赛",
            "Contest materials": "→ 比赛相关资料",
            "Settings": "→ 设置",
            "Create Mashup Contest": "→ 克隆比赛到组合混搭",
            "Clone Contest to Mashup": "→ 克隆比赛到组合混搭",
            "Create Mashup Contest": "→ 创建混搭比赛",
            "Submit": "→ 提交",
            "Practice": "→ 练习",
            "Problem tags": "→ 问题标签",
            "Filter Problems": "→ 过滤问题",
            "Attention": "→ 注意",
            "Past contests filter": "→ 过去的比赛筛选",
            "About Contest": "→ 关于比赛",
            "Last submissions": "→ 提交历史",
            "Streams": "→ 直播",
            "Coach rights": "→ 教练权限",
            "Advices to fill address": "→ 填写地址的建议",
            "Hacks filter": "→ 黑客过滤器",
            "Score table": "→ 评分表",
            "Contests": "→ 比赛",
            "History": "→ 编辑历史",
            "Login into Codeforces": "登录 Codeforces",
        };

        $(".caption.titled").each(function() {
            var tag = $(this).text();
            for (var property in translations) {
                if (tag.match(property)) {
                    $(this).addClass(property);
                    $(this).text(translations[property]);
                    break;
                }
            }
        });
    })();
    // 题目Tag汉化
    (function() {
        var parentElement = $('._FilterByTagsFrame_addTagLabel');
        var selectElement = parentElement.find('select');
        var translations = {
            "*combine tags by OR": "*按逻辑或组合我选择的标签",
            "combine-tags-by-or": "*按逻辑或组合我选择的标签（combine-tags-by-or）",
            "2-sat": "二分图可满足性问题（2-sat）",
            "binary search": "二分搜索（binary search）",
            "bitmasks": "位掩码（bitmasks）",
            "brute force": "暴力枚举（brute force）",
            "chinese remainder theorem": "中国剩余定理（chinese remainder theorem）",
            "combinatorics": "组合数学（combinatorics）",
            "constructive algorithms": "构造算法（constructive algorithms）",
            "data structures": "数据结构（data structures）",
            "dfs and similar": "深度优先搜索及其变种（dfs and similar）",
            "divide and conquer": "分治算法（divide and conquer）",
            "dp": "动态规划（dp）",
            "dsu": "并查集（dsu）",
            "expression parsing": "表达式解析（expression parsing）",
            "fft": "快速傅里叶变换（fft）",
            "flows": "流（flows）",
            "games": "博弈论（games）",
            "geometry": "计算几何（geometry）",
            "graph matchings": "图匹配（graph matchings）",
            "graphs": "图论（graphs）",
            "greedy": "贪心策略（greedy）",
            "hashing": "哈希表（hashing）",
            "implementation": "实现问题，编程技巧，模拟（implementation）",
            "interactive": "交互性问题（interactive）",
            "math": "数学（math）",
            "matrices": "矩阵（matrices）",
            "meet-in-the-middle": "meet-in-the-middle算法（meet-in-the-middle）",
            "number theory": "数论（number theory）",
            "probabilities": "概率论（probabilities）",
            "schedules": "调度算法（schedules）",
            "shortest paths": "最短路算法（shortest paths）",
            "sortings": "排序算法（sortings）",
            "string suffix structures": "字符串后缀结构（string suffix structures）",
            "strings": "字符串处理（strings）",
            "ternary search": "三分搜索（ternary search）",
            "trees": "树形结构（trees）",
            "two pointers": "双指针算法（two pointers）"
        };
        selectElement.find("option").each(function() {
            var optionValue = $(this).val();
            if (translations[optionValue]) {
                $(this).text(translations[optionValue]);
            }
        });
        $("._FilterByTagsFrame_tagBoxCaption").each(function() {
            var tag = $(this).text();
            if (tag in translations) {
                $(this).text(translations[tag]);
            }
        });
        $(".notice").each(function() {
            var tag = $(this).text();
            if (tag in translations) {
                $(this).text(translations[tag]);
            }
        });
        $(".tag-box").each(function() {
            var tag = $(this).text();
            for (var property in translations) {
                property = property.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&');
                if (tag.match(property)) {
                    $(this).text(translations[property]);
                    break;
                }
            }
        });
    })();
    // 题目过滤器选项汉化
    (function() {
        var parentElement = $('#gym-filter-form');
        var selectElement = parentElement.find('div');
        var translations = {
            "Contest type:": "比赛类型:",
            "ICPC region:": "ICPC地区:",
            "Contest format:": "比赛形式:",
            "Order by:": "排序方式:",
            "Secondary order by:": "次要排序方式:",
            "Hide, if participated:": "隐藏我参加过的:",
        };
        selectElement.find("label").each(function() {
            var optionValue = $(this).text();
            if (translations[optionValue]) {
                $(this).text(translations[optionValue]);
            }
        });
        translations = {
            "Season:": "时间范围（年度）",
            "Duration, hours:": "持续时间（小时）:",
            "Difficulty:": "难度:"
        };
        selectElement.each(function() {
            var optionValue = $(this).text();
            if (translations[optionValue]) {
                $(this).text(translations[optionValue]);
            }
        });
    })();
    (function() {
        var parentElement = $('.setting-value');
        var selectElement = parentElement.find('select');
        var translations = {
            "Official ACM-ICPC Contest": "ICPC官方比赛",
            "Official School Contest": "学校官方比赛",
            "Opencup Contest": "Opencup比赛",
            "School/University/City/Region Championship": "学校/大学/城市/地区锦标赛",
            "Training Camp Contest": "训练营比赛",
            "Official International Personal Contest": "官方国际个人赛",
            "Training Contest": "训练比赛",
            "ID_ASC": "创建时间（升序）",
            "ID_DESC": "创建时间（降序）",
            "RATING_ASC": "评分（升序）",
            "RATING_DESC": "评分（降序）",
            "DIFFICULTY_ASC": "难度（升序）",
            "DIFFICULTY_DESC": "难度（降序）",
            "START_TIME_ASC": "开始时间（升序）",
            "START_TIME_DESC": "开始时间（降序）",
            "DURATION_ASC": "持续时间（升序）",
            "DURATION_DESC": "持续时间（降序）",
            "POPULARITY_ASC": "热度（升序）",
            "POPULARITY_DESC": "热度（降序）",
            "UPDATE_TIME_ASC": "更新时间（升序）",
            "UPDATE_TIME_DESC": "更新时间（降序）"
        };
        selectElement.find("option").each(function() {
            var optionValue = $(this).val();
            if (translations[optionValue]) {
                $(this).text(translations[optionValue]);
            }
        });
        parentElement = $('.setting-last-value');
        selectElement = parentElement.find('select');
        selectElement.find("option").each(function() {
            var optionValue = $(this).val();
            if (translations[optionValue]) {
                $(this).text(translations[optionValue]);
            }
        });
    })();
    // 比赛过滤器选项汉化
    (function() {
        var parentElement = $('.options');
        var selectElement = parentElement.find('li');
        var translations = {
            "Educational": "教育性",
            "Global": "全球",
            "VK Cup": "VK杯",
            "Long Rounds": "长期回合",
            "April Fools": "愚人节",
            "Team Contests": "团队比赛",
            "ICPC Scoring": "ICPC计分",
            "Doesn't matter": "----",
            "Any": "所有",
            "Yes": "是",
            "No": "否",
            "No submission(s)": "无提交",
            "Have submission(s)": "有提交",
            "No solved problem(s)": "无解决问题",
            "Have solved problem(s)": "有解决问题"
        };
        selectElement.find('label').each(function() {
            var optionValue = $(this).text();
            if (translations[optionValue]) {
                $(this).text(translations[optionValue]);
            }
        });
        $('.CaptionCont').find('span').each(function() {
            var optionValue = $(this).text();
            if (translations[optionValue]) {
                $(this).text(translations[optionValue]);
            }
        });
    })();
    // 右侧sidebox通用汉化
    (function() {
        var parentElement = $('.sidebox');
        var selectElement = parentElement.find('div');
        var translations = {
            "Show tags for unsolved problems": "显示未解决问题的标签",
            "Hide solved problems": "隐藏已解决的问题",
        };
        selectElement.find("label").each(function() {
            var optionValue = $(this).text();
            if (translations[optionValue]) {
                $(this).text(translations[optionValue]);
            }
        });
    })();
    // 表单字段名汉化
    (function() {
        var translations = {
            "Problem:": "题目:",
            "Language:": "语言:",
            "Source code:": "源代码:",
            "Or choose file:": "或者选择文件:",
            "Choose file:": "选择文件:",
            "Notice:": "注意:",
            "virtual participation:": "虚拟参与:",
            "Registration for the contest:": "比赛报名:",
            "Take part:": "参与:",
            "as individual participant:": "作为个人参与者:",
            "as a team member:": "作为团队成员:",
            "Virtual start time:": "虚拟开始时间:",
            "Complete problemset:": "完整的问题集:",
            "First name (English)": "名字（英文）",
            "Last name (English)": "姓氏（英文）",
            "First name (Native)": "名字（本地语言）",
            "Last name (Native)": "姓氏（本地语言）",
            "Birth date": "出生日期",
            "Country": "国家",
            "City": "城市",
            "Organization": "组织",
            "Handle/Email": "账号/邮箱",
            "Password": "密码",
        };
        $(".field-name").each(function() {
            var optionValue = $(this).text();
            if (translations[optionValue]) {
                $(this).text(translations[optionValue]);
            }
        });
    })();
    (function() {
        var translations = {
            "Terms of agreement:": "协议条款:",
            "Choose team:": "选择团队:"
        };
        $(".field-name label").each(function() {
            var optionValue = $(this).text();
            if (translations[optionValue]) {
                $(this).text(translations[optionValue]);
            }
        });
    })();
    (function() {
        var translations = {
            "Hide sidebar block \"Find user\"": "隐藏侧边栏块“查找用户”",
            "Hide sidebar block \"Current user\"": "隐藏侧边栏块“当前用户”",
            "Hide sidebar block \"Recent аctions\"": "隐藏侧边栏块“最新动态”",
            "Hide sidebar block \"Favourite groups\"": "隐藏侧边栏块“收藏组”",
            "Hide sidebar block \"Top contributors\"": "隐藏侧边栏块“贡献者排行”",
            "Hide sidebar block \"Top rated\"": "隐藏侧边栏块“评级排行”",
            "Hide sidebar block \"Streams\"": "隐藏侧边栏块“直播”",
            "Old password": "旧密码",
            "New password": "新密码",
            "Confirm new password": "确认新密码",
            "Contest email notification": "比赛邮件通知",
            "Send email on new user talk": "在有新用户对话时发送电子邮件",
            "Send email on new comment": "在有新评论时发送电子邮件",
            "Hide contact information": "隐藏联系人信息",
            "Remember me by Gmail, Facebook and etc": "通过 Gmail、Facebook 等记住我",
            "Show tags for unsolved problems": "显示未解决问题的标签",
            "Hide solved problems from problemset": "从问题集中隐藏已解决的问题",
            "Hide low rated blogs": "隐藏评级较低的博客",
            "Offer to publish great rating rises": "提供展示Rating显著提升的机会",
            "Enforce https": "强制 HTTPS",
            "Show private activity in the profile": "在个人资料中显示私人活动",
            "Show diagnostics": "显示诊断信息"
        };
        $(".field-name").each(function() {
            var tag = $(this).text();
            for (var property in translations) {
                property = property.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&');
                if (tag.match(property)) {
                    $(this).text(translations[property]);
                    break;
                }
            }
        });
    })();
    (function() {
        var translations = {
            "Postal/zip code": "邮政编码/邮编",
            "Country (English)": "国家（英文）",
            "State (English)": "州/省份（英文）",
            "City (English)": "城市（英文）",
            "Address (English)": "地址（英文）",
            "Recipient (English)": "收件人姓名（英文）",
            "Country (Native)": "国家（本地语言）",
            "State (Native)": "州/省份（本地语言）",
            "City (Native)": "城市（本地语言）",
            "Address (Native)": "地址（本地语言）",
            "Recipient (Native)": "收件人姓名（本地语言）",
            "Phone": "电话",
            "TON Wallet:": "TON 钱包:",
            "Secret Code:": "验证码:"
        };
        $("td.field-name label").each(function() {
            var optionValue = $(this).text();
            if (translations[optionValue]) {
                $(this).text(translations[optionValue]);
            }
        });
    })();

    // 按钮汉化input[type="submit"]
    (function() {
        var translations = {
            "Register for virtual participation": "报名虚拟参赛",
            "Register for practice": "登录以开始练习",
            "Apply": "应用",
            "Register": "报名",
            "Login": "登录",
            "Run": "运行",
            "Start virtual contest": "开始虚拟参赛",
            "Clone Contest": "克隆比赛",
            "Submit": "提交",
            "Save changes": "保存设置",
            "Filter": "过滤",
            "Find": "查找",
            "Create Mashup Contest": "创建混搭比赛"
        };
        $('input[type="submit"]').each(function() {
            var optionValue = $(this).val();
            if (translations[optionValue]) {
                $(this).val(translations[optionValue]);
            }
        });
    })();
    (function() {
        var translations = {
            "Reset": "重置",
        };
        $('input[type="button"]').each(function() {
            var optionValue = $(this).val();
            if (translations[optionValue]) {
                $(this).val(translations[optionValue]);
            }
        });
    })();

    // 选项汉化input[type="radio"]
    (function() {
        var translations = {
            "as individual participant": "个人",
            "as a team member": "作为一个团队成员",
        };
        $('input[type="radio"]').each(function() {
            var tag = $(this).parent().contents().filter(function() {
                return this.nodeType === Node.TEXT_NODE;
            });
            for (var i = 0; i < tag.length; i++) {
                var text = tag[i].textContent.trim();
                if (translations.hasOwnProperty(text)) {
                    $(this).addClass(text);
                    tag[i].replaceWith(translations[text]);
                    break;
                }
            }
        });
    })();


    // 杂项
    (function() {
        var translations = {
            "(standard input\/output)": "标准输入/输出",
        };
        $("div.notice").each(function() {
            var tag = $(this).children().eq(0).text();
            for (var property in translations) {
                if (tag.match(property)) {
                    $(this).children().eq(0).text(translations[property]);
                    break;
                }
            }
        });
    })();
    (function() {
        var translations = {
            "Ask a question": "提一个问题",
        };
        $(".ask-question-link").each(function() {
            var optionValue = $(this).text();
            if (translations[optionValue]) {
                $(this).text(translations[optionValue]);
            }
        });
    })();

    // 轻量站特殊
    if (is_mSite) {
        (function() {
            var translations = {
                "Announcements": "公告",
                "Submissions": "提交记录",
                "Contests": "比赛",
            };
            $(".caption").each(function() {
                var optionValue = $(this).text();
                if (translations[optionValue]) {
                    $(this).text(translations[optionValue]);
                }
            });
        })();
    }
};

// 配置管理函数
function setupConfigManagement(element, tempConfig, structure, configHTML, checkable) {
    let counter = 0;
    createControlBar();
    createContextMenu();

    // 键值对校验
    function valiKeyValue(value) {
        const keyValuePairs = value.split('\n');
        const regex = /^[a-zA-Z0-9_-]+\s*:\s*[a-zA-Z0-9_-]+$/;
        for (let i = 0; i < keyValuePairs.length; i++) {
            if (!regex.test(keyValuePairs[i])) {
                return false;
            }
        }
        return true;
    }

    // 新增数据
    function onAdd() {
        const styleElement = createWindow();

        const settingMenu = $("#config_edit_menu");
        settingMenu.on("click", "#save", () => {
            const config = {};
            let allFieldsValid = true;
            for (const key in structure) {
                let value = $(key).val();
                if (value || $(key).attr('require') === 'false') {
                    config[structure[key]] = $(key).val();
                    $(key).removeClass('is_null');
                } else {
                    $(key).addClass('is_null');
                    allFieldsValid = false;
                }
            }

            // 校验提示
            for (let i = 0, len = checkable.length; i < len; i++) {
                let value = $(checkable[i]).val();
                if (value && !valiKeyValue(value)) {
                    if (!$(checkable[i]).prev('span.text-error').length) {
                        $(checkable[i]).before('<span class="text-error" style="color: red;">格式不符或存在非法字符</span>');
                    }
                    allFieldsValid = false;
                } else {
                    $(checkable[i]).prev('span.text-error').remove();
                }
            }

            if (!allFieldsValid) return;
            tempConfig.configurations.push(config);

            const list = $("#config_bar_ul");
            createListItemElement(config[structure['#note']]).insertBefore($('#add_button'));

            settingMenu.remove();
            $(styleElement).remove();
        });

        settingMenu.on("click", ".btn-close", () => {
            settingMenu.remove();
            $(styleElement).remove();
        });
    }

    // 编辑数据
    function onEdit() {
        const menu = $("#config_bar_menu");
        menu.css({ display: "none" });

        const list = $("#config_bar_ul");
        const index = Array.from(list.children()).indexOf(this);

        const styleElement = createWindow();

        const settingMenu = $("#config_edit_menu");
        const configAtIndex = tempConfig.configurations[index];

        if (configAtIndex) {
            for (const key in structure) {
                $(key).val(configAtIndex[structure[key]]);
            }
        }

        settingMenu.on("click", "#save", () => {
            const config = {};
            let allFieldsValid = true;
            for (const key in structure) {
                let value = $(key).val();
                if (value || $(key).attr('require') === 'false') {
                    config[structure[key]] = $(key).val();
                    $(key).removeClass('is_null');
                } else {
                    $(key).addClass('is_null');
                    allFieldsValid = false;
                }
            }

            // 校验提示
            for (let i = 0, len = checkable.length; i < len; i++) {
                let value = $(checkable[i]).val();
                if (value && !valiKeyValue(value)) {
                    if (!$(checkable[i]).prev('span.text-error').length) {
                        $(checkable[i]).before('<span class="text-error" style="color: red;">格式不符或存在非法字符</span>');
                    }
                    allFieldsValid = false;
                } else {
                    $(checkable[i]).prev('span.text-error').remove();
                }
            }

            if (!allFieldsValid) return;
            tempConfig.configurations[index] = config;

            settingMenu.remove();
            $(styleElement).remove();
            menu.css({ display: "none" });

            list.children().eq(index).find("label").text(config.note);
        });

        // 关闭按钮
        settingMenu.on("click", ".btn-close", () => {
            settingMenu.remove();
            $(styleElement).remove();
        });
    }

    // 删除数据
    function onDelete() {
        const menu = $("#config_bar_menu");
        menu.css({ display: "none" });

        const list = $("#config_bar_ul");
        const index = Array.from(list.children()).indexOf(this);

        tempConfig.configurations.splice(index, 1);

        list.children().eq(index).remove();
    }

    // 创建编辑窗口
    function createWindow() {
        const styleElement = GM_addStyle(darkenPageStyle2);
        $("body").append(configHTML);
        addDraggable($('#config_edit_menu'));
        return styleElement;
    }

    // 创建控制面板
    function createControlBar() {
        $(element).append(`
            <div id='configControlTip' style='color:red;'></div>
            <div class='config_bar'>
                <div class='config_bar_list' id='config_bar_list'>
                    <ul class='config_bar_ul' id='config_bar_ul'></ul>
                </div>
            </div>
        `);
    }

    // 创建右键菜单
    function createContextMenu() {
        const menu = $("<div id='config_bar_menu' style='display: none;'></div>");
        menu.html(`
			<div class='config_bar_menu_item' id='config_bar_menu_edit'>修改</div>
			<div class='config_bar_menu_item' id='config_bar_menu_delete'>删除</div>
		`);
        $("body").append(menu);
    }

    // 创建新的li元素
    function createListItemElement(text) {
        const li = $("<li></li>");
        const radio = $("<input type='radio' name='config_item'></input>").appendTo(li);
        radio.attr("value", counter).attr("id", counter++);
        const label = $("<label class='config_bar_ul_li_text'></label>").text(text).attr("for", radio.attr("value")).appendTo(li);

        // 添加右键菜单
        li.on("contextmenu", function(event) {
            event.preventDefault();
            const menu = $("#config_bar_menu");
            menu.css({ display: "block", left: event.pageX, top: event.pageY });

            const deleteItem = $("#config_bar_menu_delete");
            const editItem = $("#config_bar_menu_edit");

            // 移除旧事件
            deleteItem.off("click");
            editItem.off("click");

            deleteItem.on("click", onDelete.bind(this));
            editItem.on("click", onEdit.bind(this));

            $(document).one("click", (event) => {
                if (!menu.get(0).contains(event.target)) {
                    menu.css({ display: "none" });
                    deleteItem.off("click", onDelete);
                    editItem.off("click", onEdit);
                }
            });
        });


        return li;
    }

    // 渲染列表
    function renderList() {
        const listContainer = $("#config_bar_list");
        const list = $("#config_bar_ul");
        list.empty();
        tempConfig.configurations.forEach((item) => {
            list.append(createListItemElement(item[structure['#note']]));
        });

        list.append(`
            <li id='add_button'>
                <span>+ 添加</span>
            </li>
        `);
        const addItem = $('#add_button');
        addItem.on("click", onAdd);
    };

    renderList();
    return tempConfig;
}

const CFBetter_setting_sidebar_HTML = `
<div class="CFBetter_setting_sidebar">
    <ul>
        <li><a href="#basic-settings" id="sidebar-basic-settings" class="active">基本设置</a></li>
        <li><a href="#translation-settings" id="sidebar-translation-settings">翻译设置</a></li>
        <li><a href="#clist_rating-settings" id="sidebar-clist_rating-settings">Clist设置</a></li>
        <li><a href="#code_editor-settings" id="sidebar-code_editor-settings">编辑器设置</a></li>
        <li><a href="#compatibility-settings" id="sidebar-compatibility-settings">兼容设置</a></li>
    </ul>
</div>
`;

const basic_settings_HTML = `
<div id="basic-settings" class="settings-page active">
    <h3>基本设置</h3>
    <hr>
    <div class='CFBetter_setting_list' style="padding: 0px 10px;">
        <span id="darkMode_span">黑暗模式</span>
        <div class="dark-mode-selection">
            <label>
                <input class="radio-input" type="radio" name="darkMode" value="dark" />
                <span class="CFBetter_setting_menu_label_text">黑暗</span>
                <span class="radio-icon"> </span>
            </label>
            <label>
                <input checked="" class="radio-input" type="radio" name="darkMode" value="light" />
                <span class="CFBetter_setting_menu_label_text">白天</span>
                <span class="radio-icon"> </span>
            </label>
            <label>
                <input class="radio-input" type="radio" name="darkMode" value="follow" />
                <span class="CFBetter_setting_menu_label_text">跟随系统</span>
                <span class="radio-icon"> </span>
            </label>
        </div>
    </div>
    <div class='CFBetter_setting_list'>
        <label for="bottomZh_CN">界面汉化</label>
        <input type="checkbox" id="bottomZh_CN" name="bottomZh_CN">
    </div>
    <div class='CFBetter_setting_list'>
    <label for="showLoading">显示加载提示信息</label>
    <div class="help_tip">
        ${helpCircleHTML}
        <div class="tip_text">
        <p>当你开启 显示加载信息 时，每次加载页面时会在上方显示加载信息提示：“Codeforces Better! —— xxx”</p>
        <p>这用于了解脚本当前的工作情况，<strong>如果你不想看到，可以选择关闭</strong></p>
        <p><u>需要说明的是，如果你需要反馈脚本的任何加载问题，请开启该选项后再截图，以便于分析问题</u></p>
        </div>
    </div>
    <input type="checkbox" id="showLoading" name="showLoading">
    </div>
    <div class='CFBetter_setting_list'>
    <label for="hoverTargetAreaDisplay">显示目标区域范围</label>
    <div class="help_tip">
        ${helpCircleHTML}
        <div class="tip_text">
        <p>开启后当鼠标悬浮在 MD视图/复制/翻译 按钮上时，会显示其目标区域的范围</p>
        </div>
    </div>
    <input type="checkbox" id="hoverTargetAreaDisplay" name="hoverTargetAreaDisplay">
    </div>
    <div class='CFBetter_setting_list'>
        <label for="expandFoldingblocks">自动展开折叠块</label>
        <input type="checkbox" id="expandFoldingblocks" name="expandFoldingblocks">
    </div>
    <div class='CFBetter_setting_list'>
    <label for="renderPerfOpt">折叠块渲染优化</label>
    <div class="help_tip">
        ${helpCircleHTML}
        <div class="tip_text">
        <p>为折叠块元素添加 contain 约束</p>
        <div style="border: 1px solid #795548; padding: 10px;">
            <p>
            contain: layout style;
            </p>
        </div>
        <p>如果您的浏览器查看大量折叠块时比较卡顿，开启后<strong>可能</strong>会有一定程度的改善</p>
        </div>
    </div>
    <input type="checkbox" id="renderPerfOpt" name="renderPerfOpt">
    </div>
    <div class='CFBetter_setting_list'>
    <label for="commentPaging">评论区分页</label>
    <div class="help_tip">
        ${helpCircleHTML}
        <div class="tip_text">
        <p>对评论区分页显示，每页显示指定数量的<strong>主楼</strong></p>
        </div>
    </div>
    <input type="checkbox" id="commentPaging" name="commentPaging">
    </div>
    <div class='CFBetter_setting_list'>
        <label for="showJumpToLuogu">显示跳转到洛谷</label>
        <div class="help_tip">
            ${helpCircleHTML}
            <div class="tip_text">
            <p>洛谷OJ上收录了Codeforces的部分题目，一些题目有翻译和题解</p>
            <p>开启显示后，如果当前题目被收录，则会在题目的右上角显示洛谷标志，</p>
            <p>点击即可一键跳转到该题洛谷的对应页面。</strong></p>
            </div>
        </div>
        <input type="checkbox" id="showJumpToLuogu" name="showJumpToLuogu">
    </div>
    <div class='CFBetter_setting_list'>
        <label for="standingsRecolor">榜单重新着色</label>
        <div class="help_tip">
            ${helpCircleHTML}
            <div class="tip_text">
            <p>对于采用 Codeforces 赛制的比赛榜单</p>
            <p>按照“得分/总分”所在的范围为分数重新渐变着色</p>
            <p>范围：1~0.7~0.45~0 深绿色→浅橙色→深橙色→红色</p>
            </div>
        </div>
        <input type="checkbox" id="standingsRecolor" name="standingsRecolor">
    </div>
</div>
`;

const translation_settings_HTML = `
<div id="translation-settings" class="settings-page">
    <h3>翻译设置</h3>
    <hr>
    <h4>首选项</h4>
    <label>
        <input type='radio' name='translation' value='deepl'>
        <span class='CFBetter_setting_menu_label_text'>deepl翻译</span>
    </label>
    <label>
        <input type='radio' name='translation' value='iflyrec'>
        <span class='CFBetter_setting_menu_label_text'>讯飞听见翻译</span>
    </label>
    <label>
        <input type='radio' name='translation' value='youdao'>
        <span class='CFBetter_setting_menu_label_text'>有道翻译</span>
    </label>
    <label>
        <input type='radio' name='translation' value='google'>
        <span class='CFBetter_setting_menu_label_text'>Google翻译</span>
    </label>
    <label>
        <input type='radio' name='translation' value='caiyun'>
        <span class='CFBetter_setting_menu_label_text'>彩云小译翻译</span>
    </label>
    <label>
        <input type='radio' name='translation' value='openai'>
        <span class='CFBetter_setting_menu_label_text'>ChatGPT翻译
            <div class="help_tip">
                ${helpCircleHTML}
                <div class="tip_text">
                <p><b>请在下方添加并选定你想使用的配置信息，右键可以修改和删除配置</b></p>
                <p>具体请阅读脚本页的介绍</p>
                </div>
            </div>
        </span>
    </label>
    <div class='CFBetter_setting_menu_input' id='openai' style='display: none;'>
        <div id="chatgpt-config"></div>
    </div>
    <h4>偏好</h4>
    <div class='CFBetter_setting_list'>
        <label for="comment_translation_choice" style="display: flex;">评论区翻译</label>
        <select id="comment_translation_choice" name="comment_translation_choice">
            <option value="0">跟随首选项</option>
            <option value="deepl">deepl翻译</option>
            <option value="iflyrec">讯飞听见翻译</option>
            <option value="youdao">有道翻译</option>
            <option value="google">Google翻译</option>
            <option value="caiyun">彩云小译翻译</option>
            <option value="openai">ChatGPT翻译</option>
        </select>
    </div>
    <h4>高级</h4>
    <div class='CFBetter_setting_list'>
        <label for="comment_translation_mode" style="display: flex;">工作模式</label>
        <div class="help_tip">
            ${helpCircleHTML}
            <div class="tip_text">
            <p>你可以选择脚本的工作方式</p>
            <p>○ 普通模式：会一次性翻译整个区域的内容</p>
            <p>○ 分段模式：会对区域内的每一个&#60;&#112;&#47;&#62;和&#60;&#105;&#47;&#62;标签依次进行翻译</p>
            <p>○ 选段模式：你可以自由点选页面上的任何&#60;&#112;&#47;&#62;和&#60;&#105;&#47;&#62;标签进行翻译</p>
                <div style="color:#f44336;">
                    <p><u>注意：分段/选段模式会产生如下问题：</u></p>
                    <p>- 使得翻译接口无法知晓整个文本的上下文信息，会降低翻译质量。</p>
                    <p>- 会有<strong>部分内容不会被翻译/不能被选中</strong>，因为它们不是&#60;&#112;&#47;&#62;或&#60;&#105;&#47;&#62;元素</p>
                </div>
            </div>
        </div>
        <select id="comment_translation_mode" name="comment_translation_mode">
            <option value="0">普通模式</option>
            <option value="1">分段模式</option>
            <option value="2">选段模式</option>
        </select>
    </div>
    <div class='CFBetter_setting_list'>
        <label for="translation_retransAction" style="display: flex;">重新翻译时</label>
        <div class="help_tip">
            ${helpCircleHTML}
            <div class="tip_text">
            <p>选择在重新翻译时是"关闭旧的结果"还是"收起旧的结果"</p>
            </div>
        </div>
        <select id="translation_retransAction" name="translation_retransAction">
            <option value=0>关闭旧的结果</option>
            <option value=1>收起旧的结果</option>
        </select>
    </div>
    <div class='CFBetter_setting_list'>
        <label for='transWaitTime'>
            <div style="display: flex;align-items: center;">
                <span>等待间隔</span>
            </div>
        </label>
        <div class="help_tip">
            ${helpCircleHTML}
            <div class="tip_text">
                <p>设置在 分段/选段 模式中翻译两段间的等待间隔，建议 200 + 毫秒</p>
            </div>
        </div>
        <input type='number' id='transWaitTime' class='no_default' placeholder='请输入' require = true>
        <span>毫秒</span>
    </div>
    <div class='CFBetter_setting_list'>
        <label for="translation_replaceSymbol" style="display: flex;">LaTeX替换符</label>
        <div class="help_tip">
            ${helpCircleHTML}
            <div class="tip_text">
            <p>脚本通过先取出所有的LaTeX公式，并使用替换符占位，来保证公式不会被翻译接口所破坏</p>
            <p>对于各个翻译服务，不同的替换符本身遭到破坏的概率有所不同，具体请阅读脚本页的说明</p>
            <p>注意：使用ChatGPT翻译时不需要上述操作, 因此不受此选项影响</p>
            <p>具体您可以前往阅读脚本页的说明</p>
            </div>
        </div>
        <select id="translation_replaceSymbol" name="translation_replaceSymbol">
            <option value=2>使用{}</option>
            <option value=1>使用【】</option>
            <option value=3>使用[]</option>
        </select>
    </div>
</div>
`;

const clist_rating_settings_HTML = `
<div id="clist_rating-settings" class="settings-page">
    <h3>Clist设置</h3>
    <hr>
    <h4>基本</h4>
    <div class='CFBetter_setting_list' style="background-color: #E0F2F1;border: 1px solid #009688;">
        <div>
            <p>注意：在不同页面工作所需要的凭证有所不同，具体请看对应选项的标注说明</p>
        </div>
    </div>
    <div class='CFBetter_setting_list'>
        <label for='clist_Authorization'>
            <div style="display: flex;align-items: center;">
                <span class="input_label">KEY:</span>
            </div>
        </label>
        <div class="help_tip">
            ${helpCircleHTML}
            <div class="tip_text">
                <p>格式样例：</p>
                <div style="border: 1px solid #795548; padding: 10px;">
                    <p>ApiKey XXXXXXXXX</p>
                </div>
            </div>
        </div>
        <input type='text' id='clist_Authorization' class='no_default' placeholder='请输入KEY' require = true>
    </div>
    <hr>
    <h4>显示Rating分</h4>
    <div class='CFBetter_setting_list'>
        <label for="showClistRating_contest"><span>比赛问题集页</span></label>
        <div class="help_tip" style="margin-right: initial;">
            ${helpCircleHTML}
            <div class="tip_text">
            <p>数据来源clist.by</p>
            <p>您需要提供官方的api key</p>
            <p>或让您的浏览器上的clist.by处于登录状态（即cookie有效）</p>
            </div>
        </div>
        <div class="badge">Cookie/API KEY</div>
        <input type="checkbox" id="showClistRating_contest" name="showClistRating_contest">
    </div>
    <div class='CFBetter_setting_list'>
        <label for="showClistRating_problem"><span>题目页</span></label>
        <div class="help_tip" style="margin-right: initial;">
            ${helpCircleHTML}
            <div class="tip_text">
            <p>需要让您的浏览器上的clist.by处于登录状态（即cookie有效）才能正常工作</p>
            </div>
        </div>
        <div class="badge">Cookie</div>
        <input type="checkbox" id="showClistRating_problem" name="showClistRating_problem">
    </div>
    <div class='CFBetter_setting_list'>
        <label for="showClistRating_problemset"><span>题单页</span></label>
        <div class="help_tip" style="margin-right: initial;">
            ${helpCircleHTML}
            <div class="tip_text">
            <p>需要让您的浏览器上的clist.by处于登录状态（即cookie有效）才能正常工作</p>
            </div>
        </div>
        <div class="badge">Cookie</div>
        <input type="checkbox" id="showClistRating_problemset" name="showClistRating_problemset">
    </div>
    <hr>
    <div class='CFBetter_setting_list'>
        <label for="RatingHidden"><span>防剧透</span></label>
        <div class="help_tip">
            ${helpCircleHTML}
            <div class="tip_text">
            <p>只有当鼠标移动到Rating分展示区域上时才显示</p>
            </div>
        </div>
        <input type="checkbox" id="RatingHidden" name="RatingHidden">
    </div>
</div>
`;

const code_editor_settings_HTML = `
<div id="code_editor-settings" class="settings-page">
    <h3>编辑器设置</h3>
    <hr>
    <h4>基本</h4>
    <div class='CFBetter_setting_list'>
        <label for="problemPageCodeEditor"><span>快速代码编辑器</span></label>
        <div class="help_tip">
            ${helpCircleHTML}
            <div class="tip_text">
            <p>在问题页下面添加快速代码编辑器</p>
            <p>支持代码补全，自动保存，在线代码调试</p>
            </div>
        </div>
        <input type="checkbox" id="problemPageCodeEditor" name="problemPageCodeEditor">
    </div>
    <hr>
    <h4>编辑器设置</h4>
    <div class='CFBetter_setting_list'>
        <label for='indentSpacesCount'>
            <div style="display: flex;align-items: center;">
                <span>缩进空格数</span>
            </div>
        </label>
        <input type='number' id='indentSpacesCount' class='no_default' placeholder='请输入' require = true>
    </div>
    <div class='CFBetter_setting_list'>
        <label for="howToIndent" style="display: flex;">Tab行为</label>
        <select id="howToIndent" name="howToIndent">
            <option value="space">使用空格缩进</option>
            <option value="tab">使用制表符缩进</option>
        </select>
    </div>
    <div class='CFBetter_setting_list'>
        <label for="isWrapEnabled"><span>自动换行</span></label>
        <input type="checkbox" id="isWrapEnabled" name="isWrapEnabled">
    </div>
    <div class='CFBetter_setting_list'>
        <label for="keywordAutoComplete"><span>关键字自动补全</span></label>
        <input type="checkbox" id="keywordAutoComplete" name="keywordAutoComplete">
    </div>
    <div class='CFBetter_setting_list'>
        <label for="cppCodeTemplateComplete"><span>C++代码模板补全</span></label>
        <div class="help_tip">
            ${helpCircleHTML}
            <div class="tip_text">
            <p>开启C++代码模板级补全，模板来自<a href="https://www.acwing.com/file_system/file/content/whole/index/content/2145234/" target="_blank">AcWing</a></p>
            </div>
        </div>
        <input type="checkbox" id="cppCodeTemplateComplete" name="cppCodeTemplateComplete">
    </div>
    <hr>
    <h4>在线代码调试</h4>
    <label>
        <input type='radio' name='compiler' value='official'>
        <span class='CFBetter_setting_menu_label_text'>Codeforces</span>
    </label>
    <label>
        <input type='radio' name='compiler' value='wandbox'>
        <span class='CFBetter_setting_menu_label_text'>wandbox
            <div class="help_tip">
                ${helpCircleHTML}
                <div class="tip_text">
                <p>由wandbox提供</p>
                </div>
            </div>
        </span>
    </label>
    <label>
        <input type='radio' name='compiler' value='rextester'>
        <span class='CFBetter_setting_menu_label_text'>rextester</span>
    </label>
    <label>
        <input type='radio' name='compiler' value='codechef'>
        <span class='CFBetter_setting_menu_label_text'>codechef
            <div class="help_tip">
                ${helpCircleHTML}
                <div class="tip_text">
                <p>请在下方添加csrfToken</p>
                </div>
            </div>
        </span>
    </label>
    <div class='CFBetter_setting_menu_input' id='codechef' style='display: none;'>
        <div class='CFBetter_setting_list'>
            <label for='codecheCsrfToken'>
                <div style="display: flex;align-items: center;">
                    <span class="input_label">CsrfToken:</span>
                </div>
            </label>
            <div class="help_tip">
                ${helpCircleHTML}
                <div class="tip_text">
                <p><b>请填写csrfToken</b>，注意不包含单引号</p>
                <p>登录codechef网站，然后打开codechef页面的控制台，输入csrfToken即可查看</p>
                </div>
            </div>
            <input type='text' id='codecheCsrfToken' class='no_default' placeholder='请输入KEY' require = true>
        </div>
    </div>
</div>
`;

const compatibility_settings_HTML = `
<div id="compatibility-settings" class="settings-page">
    <h3>兼容设置</h3>
    <hr>
    <div class='CFBetter_setting_list'>
        <label for="loaded"><span id="loaded_span">不等待页面资源加载</span></label>
        <div class="help_tip">
            ${helpCircleHTML}
            <div class="tip_text">
            <p>为了防止在页面资源未加载完成前（主要是各种js）执行脚本产生意外的错误，脚本默认会等待 window.onload 事件</p>
            <p>如果您的页面上方的加载信息始终停留在：“等待页面资源加载”，即使页面已经完成加载</p>
            <p><u>您首先应该确认是否是网络问题，</u></p>
            <p>如果不是，那这可能是由于 window.onload 事件在您的浏览器中触发过早（早于DOMContentLoaded），</p>
            <p>您可以尝试开启该选项来不再等待 window.onload 事件</p>
            <p><u>注意：如果没有上述问题，请不要开启该选项</u></p>
            </div>
        </div>
        <input type="checkbox" id="loaded" name="loaded">
    </div>
</div>
`;

const CFBetter_setting_content_HTML = `
<div class="CFBetter_setting_content">
    ${basic_settings_HTML}
    ${translation_settings_HTML}
    ${clist_rating_settings_HTML}
    ${code_editor_settings_HTML}
    ${compatibility_settings_HTML}
</div>
`;
const CFBetterSettingMenu_HTML = `
    <div class='CFBetter_setting_menu' id='CFBetter_setting_menu'>
    <div class="tool-box">
        <button class="btn-close">×</button>
    </div>
    <div class="CFBetter_setting_container">
        ${CFBetter_setting_sidebar_HTML}
        ${CFBetter_setting_content_HTML}
    </div>
`;

const chatgptConfigEditHTML = `
    <div class='CFBetter_setting_menu' id='config_edit_menu'>
        <div class="tool-box">
            <button class="btn-close">×</button>
        </div>
        <h4>配置</h4>
        <h5>基本</h5>
        <hr>
        <label for='note'>
            <span class="input_label">备注:</span>
        </label>
        <input type='text' id='note' class='no_default' placeholder='请为该配置取一个备注名' require = true>
        <label for='openai_model'>
            <div style="display: flex;align-items: center;">
                <span class="input_label">模型:</span>
                <div class="help_tip">
                    ${helpCircleHTML}
                    <div class="tip_text">
                    <p>留空则默认为：gpt-3.5-turbo</p>
                    <p>模型列表请查阅<a target="_blank" href="https://platform.openai.com/docs/models">OpenAI官方文档</a></p>
                    <p><strong>此外，如果您使用的是服务商提供的代理API，请确认服务商是否支持对应模型</strong></p>
                    </div>
                </div>
            </div>
        </label>
        <input type='text' id='openai_model' placeholder='gpt-3.5-turbo' require = false>
        <label for='openai_key'>
            <div style="display: flex;align-items: center;">
                <span class="input_label">KEY:</span>
                <div class="help_tip">
                    ${helpCircleHTML}
                    <div class="tip_text">
                    <p>您需要输入自己的OpenAI key，<a target="_blank" href="https://platform.openai.com/account/usage">官网</a></p>
                    <p><b>如果您使用的是服务商提供的代理API，则应该填写服务商提供的 Key</b></p>
                    </div>
                </div>
            </div>
        </label>
        <input type='text' id='openai_key' class='no_default' placeholder='请输入KEY' require = true>
        <label for='openai_proxy'>
            <div style="display: flex;align-items: center;">
                <span class="input_label">Proxy API:</span>
                <div class="help_tip">
                    ${helpCircleHTML}
                    <div class="tip_text">
                        <p>留空则默认为OpenAI官方API</p>
                        <p>您也可以填写指定的API来代理访问OpenAI的API，</p>
                        <p>如果您使用的是服务商提供的代理API和KEY，则这里应该填写其提供的<strong>完整</strong>API地址，详请阅读脚本说明</p>
                        <p><strong>由于您指定了自定义的API，Tampermonkey会对您的跨域请求进行警告，您需要自行授权</strong></p>
                    </div>
                </div>
            </div>
        </label>
        <input type='text' id='openai_proxy' placeholder='https://api.openai.com/v1/chat/completions' require = false>
        <h5>高级</h5>
        <hr>
        <label for='_header'>
            <div style="display: flex;align-items: center;">
                <span class="input_label">自定义header</span>
                <div class="help_tip">
                    ${helpCircleHTML}
                    <div class="tip_text">
                        <p>格式样例：</p>
                        <div style="border: 1px solid #795548; padding: 10px;">
                            <p>name1 : 123<br>name2 : cccc</p>
                        </div>
                    </div>
                </div>
            </div>
        </label>
        <textarea id="_header" placeholder='（选填）您可以在这里填写向请求header中额外添加的键值对' require = false></textarea>
        <label for='_data'>
            <div style="display: flex;align-items: center;">
                <span class="input_label">自定义data</span>
                <div class="help_tip">
                    ${helpCircleHTML}
                    <div class="tip_text">
                        <p>格式样例：</p>
                        <div style="border: 1px solid #795548; padding: 10px;">
                            <p>name1 : 123<br>name2 : cccc</p>
                        </div>
                    </div>
                </div>
            </div>
        </label>
        <textarea id="_data" placeholder='（选填）您可以在这里填写向请求data中额外添加的键值对' require = false></textarea>
        <button id='save'>保存</button>
    </div>
`;

// 配置改变保存确认
function saveConfirmation() {
    return new Promise(resolve => {
        const styleElement = GM_addStyle(darkenPageStyle2);
        let htmlString = `
        <div class="CFBetter_modal">
            <h2>配置已更改，是否保存？</h2>
            <div class="buttons">
                <button id="cancelButton">不保存</button><button id="saveButton">保存</button>
            </div>
        </div>
      `;
        $('body').before(htmlString);
        addDraggable($('.CFBetter_modal'));
        $("#saveButton").click(function() {
            $(styleElement).remove();
            $('.CFBetter_modal').remove();
            resolve(true);
        });
        $("#cancelButton").click(function() {
            $(styleElement).remove();
            $('.CFBetter_modal').remove();
            resolve(false);
        });
    });
}

// 设置按钮面板
async function settingPanel() {
    // 添加按钮
    $("div[class='menu-list-container']").each(function() {
        const form = $(this).find("form[method='post'][action='/search']");
        // 创建按钮元素
        const button = $("<button class='html2mdButton CFBetter_setting'>CFBetterSetting</button>");
        // 将按钮插入到form之前
        form.before(button);
    });
    $("div[class='enter-or-register-box']").each(function() {
        $(this).after(
            "<button class='html2mdButton CFBetter_setting'>CodeforcesBetter设置</button>"
        );
    });

    const $settingBtns = $(".CFBetter_setting");
    $settingBtns.click(() => {
        const styleElement = GM_addStyle(darkenPageStyle);
        $settingBtns.prop("disabled", true).addClass("open");
        $("body").append(CFBetterSettingMenu_HTML);

        // 窗口初始化
        addDraggable($('#CFBetter_setting_menu'));

        // help浮窗位置更新
        $('.help-icon').hover(function(event) {
            var menuOffset = $('#CFBetter_setting_menu').offset();
            var mouseX = event.pageX - menuOffset.left;
            var mouseY = event.pageY - menuOffset.top;

            $('.tip_text').css({
                'top': mouseY,
                'left': mouseX
            });
        });

        // 选项卡切换
        $('.CFBetter_setting_sidebar a').click(function(event) {
            event.preventDefault();
            $('.CFBetter_setting_sidebar a').removeClass('active');
            $(this).addClass('active');
            $('.settings-page').removeClass('active');
            const targetPageId = $(this).attr('href').substring(1);
            $('#' + targetPageId).addClass('active');
        });

        const chatgptStructure = {
            '#note': 'note',
            '#openai_model': 'model',
            '#openai_key': 'key',
            '#openai_proxy': 'proxy',
            '#_header': '_header',
            '#_data': '_data',
        }
        const checkable = [
            '#_header',
            '#_data',
        ]
        let tempConfig = GM_getValue('chatgpt-config'); // 缓存配置信息
        tempConfig = setupConfigManagement('#chatgpt-config', tempConfig, chatgptStructure, chatgptConfigEditHTML, checkable);

        // 状态更新
        $("#bottomZh_CN").prop("checked", GM_getValue("bottomZh_CN") === true);
        $("input[name='darkMode'][value='" + darkMode + "']").prop("checked", true);
        $("#showLoading").prop("checked", GM_getValue("showLoading") === true);
        $("#expandFoldingblocks").prop("checked", GM_getValue("expandFoldingblocks") === true);
        $("#renderPerfOpt").prop("checked", GM_getValue("renderPerfOpt") === true);
        $("#commentPaging").prop("checked", GM_getValue("commentPaging") === true);
        $("#standingsRecolor").prop("checked", GM_getValue("standingsRecolor") === true);
        $("#showJumpToLuogu").prop("checked", GM_getValue("showJumpToLuogu") === true);
        $("#loaded").prop("checked", GM_getValue("loaded") === true);
        $("#hoverTargetAreaDisplay").prop("checked", GM_getValue("hoverTargetAreaDisplay") === true);
        $("#showClistRating_contest").prop("checked", GM_getValue("showClistRating_contest") === true);
        $("#showClistRating_problemset").prop("checked", GM_getValue("showClistRating_problemset") === true);
        $("#showClistRating_problem").prop("checked", GM_getValue("showClistRating_problem") === true);
        $("#RatingHidden").prop("checked", GM_getValue("RatingHidden") === true);
        $("input[name='translation'][value='" + translation + "']").prop("checked", true);
        $("input[name='translation']").css("color", "gray");
        if (translation == "openai") {
            $("#openai").show();
            if (tempConfig) {
                $("input[name='config_item'][value='" + tempConfig.choice + "']").prop("checked", true);
            }
        }
        $('#comment_translation_mode').val(GM_getValue("commentTranslationMode"));
        $('#comment_translation_choice').val(GM_getValue("commentTranslationChoice"));
        $('#transWaitTime').val(GM_getValue("transWaitTime"));
        $('#translation_replaceSymbol').val(GM_getValue("replaceSymbol"));
        $('#translation_retransAction').val(GM_getValue("retransAction"));
        $("#clist_Authorization").val(GM_getValue("clist_Authorization"));
        $("#problemPageCodeEditor").prop("checked", GM_getValue("problemPageCodeEditor") === true);
        $('#indentSpacesCount').val(GM_getValue("indentSpacesCount"));
        $('#howToIndent').val(GM_getValue("howToIndent"));
        $("#isWrapEnabled").prop("checked", GM_getValue("isWrapEnabled") === true);
        $("#keywordAutoComplete").prop("checked", GM_getValue("keywordAutoComplete") === true);
        $("#cppCodeTemplateComplete").prop("checked", GM_getValue("cppCodeTemplateComplete") === true);
        $("input[name='compiler'][value='" + onlineCompilerChoice + "']").prop("checked", true);
        $("input[name='compiler']").css("color", "gray");
        if (onlineCompilerChoice == "codechef") {
            $("#codechef").show();
        }
        $('#codecheCsrfToken').val(GM_getValue("codecheCsrfToken"));

        // 翻译选择情况监听
        $("input[name='translation']").change(function() {
            var selected = $(this).val(); // 获取当前选中的值
            if (selected === "openai") {
                $("#openai").show();
                if (tempConfig) {
                    $("input[name='config_item'][value='" + tempConfig.choice + "']").prop("checked", true);
                }
            } else {
                $("#openai").hide();
            }
        });

        // 在线编译器选择情况监听
        $("input[name='compiler']").change(function() {
            var selected = $(this).val(); // 获取当前选中的值
            if (selected === "codechef") {
                $("#codechef").show();
            } else {
                $("#codechef").hide();
            }
        });

        // 配置选择情况监听
        $("input[name='config_item']").change(function() {
            var selected = $(this).val(); // 获取当前选中的值
            tempConfig.choice = selected;
        });

        // 关闭
        const $settingMenu = $(".CFBetter_setting_menu");
        $settingMenu.on("click", ".btn-close", async () => {
            const settings = {
                bottomZh_CN: $("#bottomZh_CN").prop("checked"),
                darkMode: $("input[name='darkMode']:checked").val(),
                showLoading: $("#showLoading").prop("checked"),
                hoverTargetAreaDisplay: $("#hoverTargetAreaDisplay").prop("checked"),
                expandFoldingblocks: $("#expandFoldingblocks").prop("checked"),
                renderPerfOpt: $("#renderPerfOpt").prop("checked"),
                commentPaging: $("#commentPaging").prop("checked"),
                standingsRecolor: $("#standingsRecolor").prop("checked"),
                showJumpToLuogu: $("#showJumpToLuogu").prop("checked"),
                loaded: $("#loaded").prop("checked"),
                translation: $("input[name='translation']:checked").val(),
                commentTranslationChoice: $('#comment_translation_choice').val(),
                commentTranslationMode: $('#comment_translation_mode').val(),
                transWaitTime: $('#transWaitTime').val(),
                replaceSymbol: $('#translation_replaceSymbol').val(),
                retransAction: $('#translation_retransAction').val(),
                showClistRating_contest: $('#showClistRating_contest').prop("checked"),
                showClistRating_problemset: $('#showClistRating_problemset').prop("checked"),
                showClistRating_problem: $('#showClistRating_problem').prop("checked"),
                RatingHidden: $('#RatingHidden').prop("checked"),
                clist_Authorization: $('#clist_Authorization').val(),
                problemPageCodeEditor: $("#problemPageCodeEditor").prop("checked"),
                indentSpacesCount: $('#indentSpacesCount').val(),
                howToIndent: $('#howToIndent').val(),
                isWrapEnabled: $("#isWrapEnabled").prop("checked"),
                keywordAutoComplete: $("#keywordAutoComplete").prop("checked"),
                cppCodeTemplateComplete: $("#cppCodeTemplateComplete").prop("checked"),
                onlineCompilerChoice: $("input[name='compiler']:checked").val(),
                codecheCsrfToken: $('#codecheCsrfToken').val(),
            };

            // 判断是否改变
            let hasChange = false;
            for (const [key, value] of Object.entries(settings)) {
                if (!hasChange && GM_getValue(key) != value) hasChange = true;
            }
            if (!hasChange && JSON.stringify(GM_getValue('chatgpt-config')) != JSON.stringify(tempConfig)) hasChange = true;

            if (hasChange) {
                const shouldSave = await saveConfirmation();
                if (shouldSave) {
                    // 数据校验
                    if (settings.translation === "openai") {
                        var selectedIndex = $('input[name="config_item"]:checked').closest('li').index();
                        if (selectedIndex === -1) {
                            $('#configControlTip').text('请选择一项配置！');
                            $('.CFBetter_setting_sidebar a').removeClass('active');
                            $('#sidebar-translation-settings').addClass('active');
                            $('.settings-page').removeClass('active');
                            $('#translation-settings').addClass('active');
                            return;
                        }
                    }

                    // 保存数据
                    let refreshPage = false; // 是否需要刷新页面
                    for (const [key, value] of Object.entries(settings)) {
                        if (!refreshPage && !(key == 'translation' || key == 'darkMode' ||
                            key == 'replaceSymbol' || key == 'commentTranslationChoice')) {
                            if (GM_getValue(key) != value) refreshPage = true;
                        }
                        GM_setValue(key, value);
                    }
                    GM_setValue('chatgpt-config', tempConfig);

                    if (refreshPage) location.reload();
                    else {
                        // 切换黑暗模式
                        if (darkMode != settings.darkMode) {
                            darkMode = settings.darkMode;
                            // 移除旧的事件监听器
                            changeEventListeners.forEach(listener => {
                                mediaQueryList.removeEventListener('change', listener);
                            });

                            if (darkMode == "follow") {
                                changeEventListeners.push(handleColorSchemeChange);
                                mediaQueryList.addEventListener('change', handleColorSchemeChange);
                                $('html').removeAttr('data-theme');
                            } else if (darkMode == "dark") {
                                $('html').attr('data-theme', 'dark');
                            } else {
                                $('html').attr('data-theme', 'light');
                                // 移除旧的事件监听器
                                const mediaQueryList = window.matchMedia('(prefers-color-scheme: dark)');
                                window.matchMedia('(prefers-color-scheme: dark)');
                            }
                        }
                        // 更新配置信息
                        translation = settings.translation;
                        replaceSymbol = settings.replaceSymbol;
                        commentTranslationChoice = settings.commentTranslationChoice;
                        if (settings.translation === "openai") {
                            var selectedIndex = $('#config_bar_ul li input[type="radio"]:checked').closest('li').index();
                            if (selectedIndex !== opneaiConfig.choice) {
                                opneaiConfig = GM_getValue("chatgpt-config");
                                const configAtIndex = opneaiConfig.configurations[selectedIndex];
                                openai_model = configAtIndex.model;
                                openai_key = configAtIndex.key;
                                openai_proxy = configAtIndex.proxy;
                                openai_header = configAtIndex._header ?
                                    configAtIndex._header.split("\n").map(header => {
                                        const [key, value] = header.split(":");
                                        return { [key.trim()]: value.trim() };
                                    }) : [];
                                openai_data = configAtIndex._data ?
                                    configAtIndex._data.split("\n").map(header => {
                                        const [key, value] = header.split(":");
                                        return { [key.trim()]: value.trim() };
                                    }) : [];
                            }
                        }
                    }
                }
            }

            $settingMenu.remove();
            $settingBtns.prop("disabled", false).removeClass("open");
            $(styleElement).remove();
        });
    });
};

// html2md转换/处理规则
var turndownService = new TurndownService({ bulletListMarker: '-' });
var turndown = turndownService.turndown;

// 保留原始
turndownService.keep(['del']);

// 丢弃
turndownService.addRule('remove-by-class', {
    filter: function(node) {
        return node.classList.contains('sample-tests') ||
            node.classList.contains('header') ||
            node.classList.contains('overlay') ||
            node.classList.contains('html2md-panel') ||
            node.classList.contains('likeForm');
    },
    replacement: function(content, node) {
        return "";
    }
});
turndownService.addRule('remove-script', {
    filter: function(node, options) {
        return node.tagName.toLowerCase() == "script" && node.type.startsWith("math/tex");
    },
    replacement: function(content, node) {
        return "";
    }
});

// inline math
turndownService.addRule('inline-math', {
    filter: function(node, options) {
        return node.tagName.toLowerCase() == "span" && node.className == "MathJax";
    },
    replacement: function(content, node) {
        var latex = $(node).next().text();
        latex = latex.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        return "$" + latex + "$";
    }
});

// block math
turndownService.addRule('block-math', {
    filter: function(node, options) {
        return node.tagName.toLowerCase() == "div" && node.className == "MathJax_Display";
    },
    replacement: function(content, node) {
        var latex = $(node).next().text();
        latex = latex.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        return "\n$$\n" + latex + "\n$$\n";
    }
});

// texFontStyle
turndownService.addRule('texFontStyle', {
    filter: function(node) {
        return (
            node.nodeName === 'SPAN' &&
            node.classList.contains('tex-font-style-bf')
        )
    },
    replacement: function(content) {
        return '**' + content + '**'
    }
})

// sectionTitle
turndownService.addRule('sectionTitle', {
    filter: function(node) {
        return (
            node.nodeName === 'DIV' &&
            node.classList.contains('section-title')
        )
    },
    replacement: function(content) {
        return '**' + content + '**'
    }
})

// bordertable
turndownService.addRule('bordertable', {
    filter: 'table',
    replacement: function(content, node) {
        if (node.classList.contains('bordertable')) {
            var output = [],
                thead = '',
                trs = node.querySelectorAll('tr');
            if (trs.length > 0) {
                var ths = trs[0].querySelectorAll('td,th');
                if (ths.length > 0) {
                    thead = '| ' + Array.from(ths).map(th => turndownService.turndown(th.innerHTML.trim())).join(' | ') + ' |\n'
                        + '| ' + Array.from(ths).map(() => ' --- ').join('|') + ' |\n';
                }
            }
            var rows = node.querySelectorAll('tr');
            Array.from(rows).forEach(function(row, i) {
                if (i > 0) {
                    var cells = row.querySelectorAll('td,th');
                    var trow = '| ' + Array.from(cells).map(cell => turndownService.turndown(cell.innerHTML.trim())).join(' | ') + ' |';
                    output.push(trow);
                }
            });
            return thead + output.join('\n');
        } else {
            return content;
        }
    }
});

// 题目markdown转换/翻译面板
function addButtonPanel(parent, suffix, type, is_simple = false) {
    let translateButtonText;
    if (commentTranslationMode == "1") translateButtonText = "分段翻译";
    else if (commentTranslationMode == "2") translateButtonText = "翻译选中";
    else translateButtonText = "翻译";

    let htmlString = `<div class='html2md-panel'>
    <button class='html2mdButton' id='html2md-view${suffix}'>MarkDown视图</button>
    <button class='html2mdButton' id='html2md-cb${suffix}'>Copy</button>
    <button class='html2mdButton' id='translateButton${suffix}'>${translateButtonText}</button>
  </div>`;
    if (type === "this_level") {
        $(parent).before(htmlString);
        var block = $("#translateButton" + suffix).parent().next();
    } else if (type === "child_level") {
        $(parent).prepend(htmlString);
        var block = $("#translateButton" + suffix).parent().parent();
    }
    if (is_simple) {
        $('.html2md-panel').find('.html2mdButton#html2md-view' + suffix + ', .html2mdButton#html2md-cb' + suffix).remove();
    }

    if (block.css("display") === "none" || block.hasClass('ojbetter-alert')) $("#translateButton" + suffix).parent().remove();
}
function addButtonWithHTML2MD(parent, suffix, type) {
    if (is_oldLatex || is_acmsguru) {
        $("#html2md-view" + suffix).css({
            "cursor": "not-allowed",
            "background-color": "#ffffff",
            "color": "#a8abb2",
            "border": "1px solid #e4e7ed"
        });
        $("#html2md-view" + suffix).prop("disabled", true);
    }
    $(document).on("click", "#html2md-view" + suffix, debounce(function() {
        var target, removedChildren = $();
        if (type === "this_level") {
            target = $("#html2md-view" + suffix).parent().next().get(0);
        } else if (type === "child_level") {
            target = $("#html2md-view" + suffix).parent().parent().get(0);
            removedChildren = $("#html2md-view" + suffix).parent().parent().children(':first').detach();
        }
        if (target.viewmd) {
            target.viewmd = false;
            $(this).text("MarkDown视图");
            $(this).removeClass("mdViewed");
            $(target).html(target.original_html);
        } else {
            target.viewmd = true;
            if (!target.original_html) {
                target.original_html = $(target).html();
            }
            if (!target.markdown) {
                target.markdown = turndownService.turndown($(target).html());
            }
            $(this).text("原始内容");
            $(this).addClass("mdViewed");
            $(target).html(`<span class="mdViewContent" oninput="$(this).parent().get(0).markdown=this.value;" style="width:auto; height:auto;">${target.markdown}</span>`);
        }
        // 恢复删除的元素
        if (removedChildren) $(target).prepend(removedChildren);
    }));

    if (hoverTargetAreaDisplay && !is_oldLatex && !is_acmsguru) {
        var previousCSS;
        $(document).on("mouseover", "#html2md-view" + suffix, function() {
            var target;

            if (type === "this_level") {
                target = $("#html2md-view" + suffix).parent().next().get(0);
            } else if (type === "child_level") {
                target = $("#html2md-view" + suffix).parent().parent().get(0);
            }

            $(target).append('<div class="overlay">目标转换区域</div>');

            previousCSS = {
                "position": $(target).css("position"),
                "display": $(target).css("display")
            };
            $(target).css({
                "position": "relative",
                "display": "block"
            });

            $("#html2md-view" + suffix).parent().css({
                "position": "relative",
                "z-index": "400"
            });
        });

        $(document).on("mouseout", "#html2md-view" + suffix, function() {
            var target;

            if (type === "this_level") {
                target = $("#html2md-view" + suffix).parent().next().get(0);
            } else if (type === "child_level") {
                target = $("#html2md-view" + suffix).parent().parent().get(0);
            }

            $(target).find('.overlay').remove();
            if (previousCSS) {
                $(target).css(previousCSS);
            }
            $("#html2md-view" + suffix).parent().css({
                "position": "static"
            });
        });
    }
}

function addButtonWithCopy(parent, suffix, type) {
    if (is_oldLatex || is_acmsguru) {
        $("#html2md-cb" + suffix).css({
            "cursor": "not-allowed",
            "background-color": "#ffffff",
            "color": "#a8abb2",
            "border": "1px solid #e4e7ed"
        });
        $("#html2md-cb" + suffix).prop("disabled", true);
    }
    $(document).on("click", "#html2md-cb" + suffix, debounce(function() {
        var target, removedChildren;
        if (type === "this_level") {
            target = $("#translateButton" + suffix).parent().next().eq(0).clone();
        } else if (type === "child_level") {
            target = $("#translateButton" + suffix).parent().parent().eq(0).clone();
            $(target).children(':first').remove();
        }
        if ($(target).find('.mdViewContent').length <= 0) {
            text = turndownService.turndown($(target).html());
        } else {
            text = $(target).find('.mdViewContent').text();
        }
        GM_setClipboard(text);
        $(this).addClass("copied");
        $(this).text("Copied");
        // 更新复制按钮文本
        setTimeout(() => {
            $(this).removeClass("copied");
            $(this).text("Copy");
        }, 2000);
        $(target).remove();
    }));

    if (hoverTargetAreaDisplay && !is_oldLatex && !is_acmsguru) {
        var previousCSS;
        $(document).on("mouseover", "#html2md-cb" + suffix, function() {
            var target;

            if (type === "this_level") {
                target = $("#html2md-cb" + suffix).parent().next().get(0);
            } else if (type === "child_level") {
                target = $("#html2md-cb" + suffix).parent().parent().get(0);
            }

            $(target).append('<div class="overlay">目标复制区域</div>');
            previousCSS = {
                "position": $(target).css("position"),
                "display": $(target).css("display")
            };
            $(target).css({
                "position": "relative",
                "display": "block"
            });
            $("#html2md-cb" + suffix).parent().css({
                "position": "relative",
                "z-index": "400"
            })
        });

        $(document).on("mouseout", "#html2md-cb" + suffix, function() {
            var target;

            if (type === "this_level") {
                target = $("#html2md-cb" + suffix).parent().next().get(0);
            } else if (type === "child_level") {
                target = $("#html2md-cb" + suffix).parent().parent().get(0);
            }

            $(target).find('.overlay').remove();
            if (previousCSS) {
                $(target).css(previousCSS);
            }
            $("#html2md-cb" + suffix).parent().css({
                "position": "static"
            })
        });
    }
}

async function addButtonWithTranslation(parent, suffix, type, is_comment = false) {
    var resultStack = []; // 结果  
    $(document).on('click', '#translateButton' + suffix, debounce(async function() {
        $(this).trigger('mouseout')
            .removeClass("translated")
            .text("翻译中")
            .css("cursor", "not-allowed")
            .prop("disabled", true);
        var target, element_node, block, errerNum = 0;
        if (type === "this_level") block = $("#translateButton" + suffix).parent().next();
        else if (type === "child_level") block = $("#translateButton" + suffix).parent().parent();

        // 重新翻译
        if (resultStack) {
            let pElements = block.find("p.block_selected:not(li p), li.block_selected");
            for (let item of resultStack) {
                if (retransAction == "0") {
                    // 选段翻译不直接移除旧结果
                    if (commentTranslationMode == "2") {
                        // 只移除即将要翻译的段的结果
                        if (pElements.is(item.panelDiv.prev())) {
                            if (item.translateDiv) $(item.translateDiv).remove();
                            if (item.panelDiv) $(item.panelDiv).remove();
                            if (!is_oldLatex && !is_acmsguru) {
                                if (item.copyDiv) $(item.copyDiv).remove();
                            }
                        }
                    } else {
                        if (item.translateDiv) $(item.translateDiv).remove();
                        if (item.panelDiv) $(item.panelDiv).remove();
                        if (!is_oldLatex && !is_acmsguru) {
                            if (item.copyDiv) $(item.copyDiv).remove();
                        }
                        $(block).find(".translate-problem-statement, .translate-problem-statement-panel").remove();
                    }
                } else {
                    item.upButton.html(unfoldIcon);
                    $(item.translateDiv).css({
                        display: "none",
                        transition: "height 2s"
                    });
                }
            }

            // 移除旧的事件
            $(document).off("mouseover", "#translateButton" + suffix);
            $(document).off("mouseout", "#translateButton" + suffix);
            // 重新绑定悬停事件
            if (hoverTargetAreaDisplay) bindHoverEvents(suffix, type);
        }

        if (commentTranslationMode == "1") {
            // 分段翻译
            var pElements = block.find("p:not(li p), li, .CFBetter_acmsguru");
            for (let i = 0; i < pElements.length; i++) {
                target = $(pElements[i]).eq(0).clone();
                element_node = pElements[i];
                if (type === "child_level") {
                    $(pElements[i]).append("<div></div>");
                    element_node = $(pElements[i]).find("div:last-child").get(0);
                }
                resultStack.push(await blockProcessing(target, element_node, $("#translateButton" + suffix), is_comment));

                let topStack = resultStack[resultStack.length - 1];
                if (topStack.status) errerNum += 1;
                $(target).remove();
                await new Promise(resolve => setTimeout(resolve, transWaitTime));
            }
        } else if (commentTranslationMode == "2") {
            // 选段翻译
            var pElements = block.find("p.block_selected:not(li p), li.block_selected, .CFBetter_acmsguru");
            for (let i = 0; i < pElements.length; i++) {
                target = $(pElements[i]).eq(0).clone();
                element_node = pElements[i];
                if (type === "child_level") {
                    $(pElements[i]).append("<div></div>");
                    element_node = $(pElements[i]).find("div:last-child").get(0);
                }
                resultStack.push(await blockProcessing(target, element_node, $("#translateButton" + suffix), is_comment));

                let topStack = resultStack[resultStack.length - 1];
                if (topStack.status) errerNum += 1;
                $(target).remove();
                await new Promise(resolve => setTimeout(resolve, transWaitTime));
            }
            block.find("p.block_selected:not(li p), li.block_selected").removeClass('block_selected');
        } else {
            // 普通翻译
            target = block.eq(0).clone();
            if (type === "child_level") $(target).children(':first').remove();
            element_node = $(block).get(0);
            if (type === "child_level") {
                $(parent).append("<div></div>");
                element_node = $(parent).find("div:last-child").get(0);
            }
            //是否跳过折叠块
            if ($(target).find('.spoiler').length > 0) {
                const shouldSkip = await skiFoldingBlocks();
                if (shouldSkip) {
                    $(target).find('.spoiler').remove();
                } else {
                    $(target).find('.html2md-panel').remove();
                }
            }
            resultStack.push(await blockProcessing(target, element_node, $("#translateButton" + suffix), is_comment));

            let topStack = resultStack[resultStack.length - 1];
            if (topStack.status) errerNum += 1;
            $(target).remove();
        }
        if (!errerNum) {
            $(this).addClass("translated")
                .text("已翻译")
                .css("cursor", "pointer")
                .removeClass("error")
                .prop("disabled", false);
        } else {
            $(this).prop("disabled", false);
        }

        // 重新翻译
        let currentText, is_error;
        $(document).on("mouseover", "#translateButton" + suffix, function() {
            currentText = $(this).text();
            $(this).text("重新翻译");
            if ($(this).hasClass("error")) {
                is_error = true;
                $(this).removeClass("error");
            }
        });

        $(document).on("mouseout", "#translateButton" + suffix, function() {
            $(this).text(currentText);
            if (is_error) $(this).addClass("error");
        });
    }));

    // 目标区域指示
    function bindHoverEvents(suffix, type) {
        var previousCSS;

        $(document).on("mouseover", "#translateButton" + suffix, function() {
            var target;

            if (type === "this_level") {
                target = $("#translateButton" + suffix).parent().next().get(0);
            } else if (type === "child_level") {
                target = $("#translateButton" + suffix).parent().parent().get(0);
            }

            $(target).append('<div class="overlay">目标翻译区域</div>');

            previousCSS = {
                "position": $(target).css("position"),
                "display": $(target).css("display")
            };
            $(target).css({
                "position": "relative",
                "display": ($(target).hasClass('question-response')) ? "block" : $(target).css("display")
            });

            $("#translateButton" + suffix).parent().css({
                "position": "relative",
                "z-index": "400"
            });
        });

        $(document).on("mouseout", "#translateButton" + suffix, function() {
            var target;

            if (type === "this_level") {
                target = $("#translateButton" + suffix).parent().next().get(0);
            } else if (type === "child_level") {
                target = $("#translateButton" + suffix).parent().parent().get(0);
            }

            $(target).find('.overlay').remove();

            if (previousCSS) {
                $(target).css(previousCSS);
            }

            $("#translateButton" + suffix).parent().css({
                "position": "static"
            });
        });
    }

    if (hoverTargetAreaDisplay) bindHoverEvents(suffix, type);

    // 右键菜单
    $(document).on('contextmenu', '#translateButton' + suffix, function(e) {
        e.preventDefault();

        // 是否为评论的翻译
        let is_comment = false;
        if ($("#translateButton" + suffix).parents('.comments').length > 0) is_comment = true;

        // 移除旧的
        if (!$(e.target).closest('.CFBetter_contextmenu').length) {
            $('.CFBetter_contextmenu').remove();
        }

        var menu = $('<div class="CFBetter_contextmenu"></div>');
        var translations = [
            { value: 'deepl', name: 'deepl翻译' },
            { value: 'iflyrec', name: '讯飞听见翻译' },
            { value: 'youdao', name: '有道翻译' },
            { value: 'google', name: 'Google翻译' },
            { value: 'caiyun', name: '彩云小译翻译' },
            { value: 'openai', name: 'ChatGPT翻译' }
        ];
        if (is_comment) {
            var label = $('<label><input type="radio" name="translation" value="0"><span class="CFBetter_contextmenu_label_text">跟随首选项</span></label>');
            menu.append(label);
        }
        translations.forEach(function(translation) {
            var label = $(`<label><input type="radio" name="translation" value="${translation.value}">
            <span class="CFBetter_contextmenu_label_text">${translation.name}</span></label>`);
            menu.append(label);
        });

        // 初始化
        if (is_comment) {
            menu.find(`input[name="translation"][value="${commentTranslationChoice}"]`).prop('checked', true);
        } else {
            menu.find(`input[name="translation"][value="${translation}"]`).prop('checked', true);
        }
        menu.css({
            top: e.pageY + 'px',
            left: e.pageX + 'px'
        }).appendTo('body');

        $(document).one('change', 'input[name="translation"]', function() {
            if (is_comment) {
                commentTranslationChoice = $('input[name="translation"]:checked').val();
                GM_setValue("commentTranslationChoice", commentTranslationChoice);
            } else {
                translation = $('input[name="translation"]:checked').val();
                GM_setValue("translation", translation);
            }
            $('.CFBetter_contextmenu').remove();
        });

        // 点击区域外关闭菜单
        function handleClick(event) {
            if (!$(event.target).closest('.CFBetter_contextmenu').length) {
                $('.CFBetter_contextmenu').remove();
                $(document).off('change', 'input[name="translation"]');
            } else {
                $(document).one('click', handleClick);
            }
        }
        $(document).one('click', handleClick);
    });
}

// 块处理
async function blockProcessing(target, element_node, button, is_comment) {
    if (is_oldLatex || is_acmsguru) {
        $(target).find('.overlay').remove();
        target.markdown = $(target).html();
    } else if (!target.markdown) {
        target.markdown = turndownService.turndown($(target).html());
    }
    const textarea = document.createElement('textarea');
    textarea.value = target.markdown;
    var result = await translateProblemStatement(textarea.value, element_node, $(button), is_comment);
    if (result.status == 1) {
        $(button).addClass("error")
            .text("翻译中止")
            .css("cursor", "pointer")
            .prop("disabled", false);
        $(result.translateDiv).remove();
        $(target).remove();
    } else if (result.status == 2) {
        result.translateDiv.classList.add("error_translate");
        $(button).addClass("error")
            .text("翻译出错")
            .css("cursor", "pointer")
            .prop("disabled", false);
        $(target).remove();
    }
    return result;
}

// 选段翻译支持
async function multiChoiceTranslation() {
    GM_addStyle(`
        .topic .content .ttypography {
            overflow: initial;
        }
    `);

    $(document).on('click', 'p, li:not(:has(.comment)), .CFBetter_acmsguru', function(e) {
        let $this = $(this);
        e.stopPropagation();
        if ($this.hasClass('block_selected')) {
            $this.removeClass('block_selected');
            // 移除对应的按钮 
            $('.CFBetter_MiniTranslateButton').remove("#translateButton_selected_" + $this.attr('CFBetter_p_id'));
        } else {
            let id = getRandomNumber(8);
            $this.attr('CFBetter_p_id', id);
            $this.addClass('block_selected');
            // 添加按钮 
            let menu = $(`<div class="CFBetter_MiniTranslateButton" id='translateButton_selected_${id}'>${translateIcon}</div>`)
                .css({
                    left: $($this).outerWidth(true) + $($this).position().left + 10 + 'px',
                });
            $this.before(menu);

            $("#translateButton_selected_" + id).click(async function() {
                // 处理旧的结果
                if ($this.attr('translated')) {
                    let result = $this.data("resultData");
                    if (retransAction == "0") {
                        if (result.translateDiv) $(result.translateDiv).remove();
                        if (result.panelDiv) $(result.panelDiv).remove();
                        if (!is_oldLatex && !is_acmsguru) {
                            if (result.copyDiv) $(result.copyDiv).remove();
                        }
                    } else {
                        result.upButton.html(unfoldIcon);
                        $(result.translateDiv).css({
                            display: "none",
                            transition: "height 2s"
                        });
                    }
                }
                // 翻译
                let target = $this.eq(0).clone();
                let result = await blockProcessing(target, $this.eq(0), $("#translateButton_selected_" + id), false);
                $this.data("resultData", result);
                $this.removeClass('block_selected');
                // 移除对应的按钮 
                $('.CFBetter_MiniTranslateButton').remove("#translateButton_selected_" + id);
                $this.attr('translated', '1'); // 标记已翻译
            });
        }
    });
}

// 为acmsguru题面重新划分div
function acmsguruReblock() {
    if (commentTranslationMode == '0') {
        // 普通模式下的划分方式
        var html = $('.ttypography').children().html();
        var separator = /(<div align="left" style="margin-top: 1\.0em;"><b>.*?<\/b><\/div>)/g;
        var result = html.split(separator); // 分割代码
        var outputHtml = '';
        var header = '';
        for (var i = 0; i < result.length; i++) {
            if (separator.test(result[i])) {
                header = result[i];
                continue;
            }
            outputHtml += '<div class="ttypography">' + header + result[i] + '</div>';
            header = '';
        }
        $('.ttypography').html(outputHtml);
    }
    else {
        // 分段/选段模式下的划分方式
        $('.ttypography').children().each(function() {
            var html = $(this).html();
            var replacedHtml = html.replace(/(?:<\/div>|<br><br>)(?<text>[\s\S]+?)(?=<br><br>)/g,
                '<div align="left" class="CFBetter_acmsguru" >$<text></div>');
            $(this).html(replacedHtml);
        });
    }
}

function addConversionButton() {
    // 题目页添加按钮
    if (window.location.href.includes("problem")) {
        var exContentsPageClasses = ["sample-tests",];
        $('.problem-statement').children('div').each(function() {
            var className = $(this).attr('class');
            if (!exContentsPageClasses.includes(className)) {
                var id = "_problem_" + getRandomNumber(8);
                addButtonPanel(this, id, "this_level");
                addButtonWithHTML2MD(this, id, "this_level");
                addButtonWithCopy(this, id, "this_level");
                addButtonWithTranslation(this, id, "this_level");
            }
        });
    }
    // 添加按钮到ttypography部分
    $(".ttypography").each(function() {
        // 是否为评论
        let is_comment = false;
        if ($(this).parents('.comments').length > 0) is_comment = true;
        // 题目页特判
        if (!$(this).parent().hasClass('problemindexholder') || is_acmsguru) {
            let id = "_comment_" + getRandomNumber(8);
            addButtonPanel(this, id, "this_level");
            addButtonWithHTML2MD(this, id, "this_level");
            addButtonWithCopy(this, id, "this_level");
            addButtonWithTranslation(this, id, "this_level", is_comment);
        }
    });

    // 添加按钮到spoiler部分
    $('.spoiler-content').each(function() {
        if ($(this).find('.html2md-panel').length === 0) {
            let id = "_spoiler_" + getRandomNumber(8);
            addButtonPanel(this, id, "child_level");
            addButtonWithHTML2MD(this, id, "child_level");
            addButtonWithCopy(this, id, "child_level");
            addButtonWithTranslation(this, id, "child_level");
        }
    });

    // 添加按钮到titled部分
    (function() {
        var elements = [".Virtual.participation", ".Attention", ".Practice"];//只为部分titled添加
        $.each(elements, function(index, value) {
            $(value).each(function() {
                let id = "_titled_" + getRandomNumber(8);
                var $nextDiv = $(this).next().children().get(0);
                addButtonPanel($nextDiv, id, "child_level", true);
                addButtonWithTranslation($nextDiv, id, "child_level");
            });
        });
    })();
    if (is_mSite) {
        $("div[class='_IndexPage_notice']").each(function() {
            let id = "_titled_" + getRandomNumber(8);
            addButtonPanel(this, id, "this_level", true);
            addButtonWithTranslation(this, id, "this_level");
        });
    }

    // 添加按钮到比赛QA部分
    $(".question-response").each(function() {
        let id = "_question_" + getRandomNumber(8);
        addButtonPanel(this, id, "this_level", true);
        addButtonWithTranslation(this, id, "this_level");
    });
    if (is_mSite) {
        $("div._ProblemsPage_announcements table tbody tr:gt(0)").each(function() {
            var $nextDiv = $(this).find("td:first");
            let id = "_question_" + getRandomNumber(8);
            addButtonPanel($nextDiv, id, "this_level", true);
            addButtonWithTranslation($nextDiv, id, "this_level");
        });
    }

    // 添加按钮到弹窗confirm-proto部分
    $(".confirm-proto").each(function() {
        let id = "_titled_" + getRandomNumber(8);
        var $nextDiv = $(this).children().get(0);
        addButtonPanel($nextDiv, id, "this_level", true);
        addButtonWithTranslation($nextDiv, id, "this_level");
    });

    // 添加按钮到_CatalogHistorySidebarFrame_item部分
    $("._CatalogHistorySidebarFrame_item").each(function() {
        let id = "_history_sidebar_" + getRandomNumber(8);
        addButtonPanel(this, id, "this_level", true);
        addButtonWithTranslation(this, id, "this_level");
    });

    $(".problem-lock-link").on("click", function() {
        $(".popup .content div").each(function() {
            let id = "_popup_" + getRandomNumber(8);
            addButtonPanel(this, id, "this_level", true);
            addButtonWithTranslation(this, id, "this_level");
        });
    });

    // 添加按钮到弹窗alert部分
    $(".alert:not(.CFBetter_alert)").each(function() {
        let id = "_alert_" + getRandomNumber(8);
        addButtonPanel(this, id, "this_level", true);
        addButtonWithTranslation(this, id, "this_level");
    });

    // 添加按钮到talk-text部分
    $(".talk-text").each(function() {
        let id = "_talk-text_" + getRandomNumber(8);
        addButtonPanel(this, id, "child_level", true);
        addButtonWithTranslation(this, id, "child_level");
    });
};

//弹窗翻译
function alertZh() {
    var _alert = window.alert;
    window.alert = async function(msg) {
        _alert(msg + "\n=========翻译=========\n" + await translate_deepl(msg));
        return true;
    }
};

// 折叠块
function ExpandFoldingblocks() {
    $('.spoiler').addClass('spoiler-open');
    $('.spoiler-content').attr('style', '');
};

// 折叠块渲染优化
function RenderPerfOpt() {
    GM_addStyle(`
        .spoiler-content {
            contain: layout style;
        }
    `);
    // return new Promise(function (resolve) {
    //     var currentIndex = 0;
    //     var delay = 50;
    //     var maxDelay = 1000;

    //     var elements = $('.spoiler-content');
    //     var batchSize = 10;
    //     var initialDelay = 50;

    //     function processBatch(callback) {
    //         var endIndex = currentIndex + batchSize;
    //         for (var i = currentIndex; i < endIndex; i++) {
    //             if (i >= elements.length) {
    //                 callback();
    //                 resolve();
    //                 return;
    //             }
    //             var element = elements.eq(i);
    //             var height = element.outerHeight();
    //             element.css('contain-intrinsic-size', `auto ${height}px`);
    //         }

    //         currentIndex += batchSize;

    //         // 延时
    //         delay *= 2;
    //         if (delay >= maxDelay) delay = initialDelay;

    //         setTimeout(function () {
    //             processBatch(callback); // 递归
    //         }, delay);
    //     }

    //     processBatch(function () {
    //         GM_addStyle(`
    //             .spoiler-content {
    //                 contain: layout style;
    //             }
    //         `);
    //     });
    // });
}

// 分页
function CommentPagination() {
    GM_addStyle(`
        .comments > .comment {
            display: none;
        }
        #next-page-btn, #prev-page-btn {
            display: none;
        }
        #jump-input, #items-per-page{
            height: 22px;
            border: 1px solid #dcdfe6;
            border-radius: 0.3rem;
        }
        #jump-input:focus-visible{
            border-style: solid;
            border-color: #3f51b5;
            outline: none;
        }
    `);
    $('.comments').after(`
            <div id="pagBar" style="display: flex; align-items: center; justify-content: center; color: #606266;">
                <label for="items-per-page">每页展示主楼数：</label>
                <select id="items-per-page" style="margin-right: 15px;">
                    <option value="5">5</option>
                    <option value="10">10</option>
                    <option value="20">20</option>
                </select>
                <div class="paging" style="margin-right: 15px;">
                    <span id="current-page">1</span> / <span id="total-pages"></span>
                </div>
                <input type="text" id="jump-input" placeholder="跳转到页码">
                <button type="button" id="jump-btn" class="html2mdButton">跳转</button>
                <button id="prev-page-btn" class="html2mdButton">上一页</button>
                <button id="next-page-btn" class="html2mdButton">下一页</button>
            </div>
        `);

    let batchSize = 5;
    let elements = $(".comments > .comment").slice(0, -1);
    let start = 0;
    let end = batchSize;
    let currentPage = 1;
    let displayedIndexes = []; // 存储已显示元素的索引

    function showBatch(start, end) {
        // 隐藏上一页
        for (var i = 0; i < displayedIndexes.length; i++) {
            elements.eq(displayedIndexes[i]).hide();
        }

        displayedIndexes = [];

        // 显示当前页
        elements.slice(start, end).each(function(index) {
            $(this).show();
            displayedIndexes.push(start + index);
        });

        // 更新页码和翻页按钮
        $("#current-page").text(currentPage);
        $("#total-pages").text(Math.ceil(elements.length / batchSize));

        if (currentPage === 1) $("#prev-page-btn").hide();
        else $("#prev-page-btn").show();

        if (end >= elements.length) $("#next-page-btn").hide();
        else $("#next-page-btn").show();
    }

    // 初始化
    var commentID = null;
    var pageURL = window.location.href;
    if (pageURL.includes("#comment-")) {
        // 带评论区锚点的链接
        var startIndex = pageURL.lastIndexOf("#comment-") + 9;
        commentID = pageURL.substring(startIndex);
        var indexInComments = null;
        $(".comments > .comment").each(function(index) {
            $(this).find(".comment-table").each(function() {
                var tableCommentID = $(this).attr("commentid");
                if (tableCommentID === commentID) {
                    indexInComments = index;
                    return false;
                }
            });
        });
        let page = Math.ceil((indexInComments + 1) / batchSize);
        currentPage = !page ? 1 : page;
        showBatch((currentPage - 1) * batchSize, currentPage * batchSize);
        setTimeout(function() {
            window.location.href = pageURL;
        }, 1000);
    } else {
        showBatch(0, batchSize);
    }

    $("#prev-page-btn").on("click", function() {
        var itemsPerPage = parseInt($("#items-per-page").val());
        start = (currentPage - 2) * itemsPerPage;
        end = (currentPage - 1) * itemsPerPage;
        currentPage--;
        showBatch(start, end);
    });

    $("#next-page-btn").on("click", function() {
        var itemsPerPage = parseInt($("#items-per-page").val());
        start = currentPage * itemsPerPage;
        end = (currentPage + 1) * itemsPerPage;
        currentPage++;
        showBatch(start, end);
    });

    $("#jump-btn").on("click", function() {
        var inputPage = parseInt($("#jump-input").val());

        if (inputPage >= 1 && inputPage <= Math.ceil(elements.length / parseInt($("#items-per-page").val()))) {
            var itemsPerPage = parseInt($("#items-per-page").val());
            start = (inputPage - 1) * itemsPerPage;
            end = inputPage * itemsPerPage;
            currentPage = inputPage; // 更新当前页码
            showBatch(start, end);
        }
    });

    $("#items-per-page").on("change", function() {
        batchSize = parseInt($(this).val());
        let page = Math.ceil(end / batchSize);
        currentPage = !page ? 1 : page;
        let maxPage = Math.ceil(elements.length / batchSize);
        if (currentPage > maxPage) currentPage = maxPage;
        showBatch((currentPage - 1) * batchSize, currentPage * batchSize);
    });
}

// 跳转洛谷
function getProblemId(url) {
    const regex = url.includes('/contest/')
        ? /\/contest\/(\d+)\/problem\/([A-Za-z\d]+)/
        : /\/problemset\/problem\/(\d+)\/([A-Za-z\d]+)/;
    const matchResult = url.match(regex);
    return matchResult && matchResult.length >= 3 ? `${matchResult[1]}${matchResult[2]}` : '';
};

async function CF2luogu() {
    const url = window.location.href;
    const problemId = getProblemId(url);
    const checkLinkExistence = (url) => {
        return new Promise((resolve, reject) => {
            GM.xmlHttpRequest({
                method: "GET",
                url,
                headers: { "Range": "bytes=0-9999" }, // 获取前10KB数据
                onload(response) {
                    if (response.responseText.match(/题目未找到/g)) {
                        resolve(false);
                    } else {
                        resolve(true);
                    }
                },
                onerror(error) {
                    reject(error);
                }
            });
        });
    };

    let panelElement;
    if ($('#CF2luoguPanel').length > 0) {
        panelElement = $('#CF2luoguPanel');
    } else {
        panelElement = $("<div>")
            .addClass("html2md-panel")
            .attr("id", "CF2luoguPanel")
            .insertBefore('.problemindexholder');
    }

    const LuoguUrl = `https://www.luogu.com.cn/problem/CF${problemId}`;
    const result = await checkLinkExistence(LuoguUrl);
    if (problemId && result) {
        const problemLink = $("<a>")
            .attr("id", "problemLink")
            .attr("href", LuoguUrl)
            .attr("target", "_blank")
            .html(`<button style="height: 25px;" class="html2mdButton"><img style="width:45px; margin-right:2px;" src="https://cdn.luogu.com.cn/fe/logo.png"></button>`);
        panelElement.append(problemLink);
    }
}

// RatingClass
const ratingClassMap = {
    0: "rating_by_clist_color0",
    1200: "rating_by_clist_color1",
    1400: "rating_by_clist_color2",
    1600: "rating_by_clist_color3",
    1900: "rating_by_clist_color4",
    2100: "rating_by_clist_color5",
    2300: "rating_by_clist_color6",
    2400: "rating_by_clist_color7",
    2600: "rating_by_clist_color8",
    3000: "rating_by_clist_color9"
};
const cssMap = {
    "rating_by_clist_color0": "#cccccc",
    "rating_by_clist_color1": "#73e473",
    "rating_by_clist_color2": "#77ddbb",
    "rating_by_clist_color3": "#aaaaff",
    "rating_by_clist_color4": "#ff88ff",
    "rating_by_clist_color5": "#ffcc88",
    "rating_by_clist_color6": "#ffbb55",
    "rating_by_clist_color7": "#ff7777",
    "rating_by_clist_color8": "#ff3333",
    "rating_by_clist_color9": "#aa0000"
};
// cookie有效性检查
async function checkCookie(isContest = false) {
    let ok = false, congested = false;
    await new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
            method: "GET",
            url: "https://clist.by:443/api/v3/contest/?limit=1&resource_id=1",
            onload: function(response) {
                if (response.status === 200) ok = true;
                resolve();
            },
            onerror: function(response) {
                console.warn("访问clist.by出现错误，请稍后再试");
                congested = true;
                resolve();
            }
        });
    });
    if (isContest && !ok && !congested) {
        await new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: "GET",
                url: "https://clist.by:443/api/v3/contest/?limit=1&resource_id=1",
                headers: {
                    "Authorization": clist_Authorization
                },
                onload: function(response) {
                    if (response.status === 200) ok = true;
                    resolve();
                },
                onerror: function(response) {
                    console.warn("访问clist.by出现错误，请稍后再试");
                    resolve();
                }
            });
        });
    }
    if (!ok) {
        var state = congested ? `当前访问Clist.by网络拥堵，请求已中断，请稍后再重试` :
            `当前浏览器的Clist.by登录Cookie可能已失效，请打开<a target="_blank" href="https://clist.by/">Clist.by</a>重新登录
         <br>说明：脚本的Clist Rating分显示实现依赖于Clist.by的登录用户Cookie信息，
         <br>脚本不会获取您在Clist.by站点上的具体Cookie信息，具体请阅读脚本页的说明`;
        var newElement = $("<div></div>")
            .addClass("alert alert-error ojbetter-alert").html(`Codeforces Better! —— ${state}`)
            .css({ "margin": "1em", "text-align": "center", "position": "relative" });
        $(".menu-box:first").next().after(newElement);
    }
    return ok;
}
// 创建css
function creatRatingCss(hasborder = true) {
    let dynamicCss = "";
    let hiddenCss = RatingHidden ? ":hover" : "";
    for (let cssClass in cssMap) {
        dynamicCss += "." + cssClass + hiddenCss + " {\n";
        let border = hasborder ? `    border: 1px solid ${cssMap[cssClass]};\n` : `    border: 1px solid #dcdfe6;\n`;
        dynamicCss += `    color: ${cssMap[cssClass]};\n${border}}\n`;
    }
    GM_addStyle(dynamicCss);
}
// 模拟请求获取
async function getRating(problem, problem_url, contest = null) {
    problem = problem.replace(/\([\s\S]*?\)/g, '').replace(/^\s+|\s+$/g, '');
    return new Promise((resolve, reject) => {
        const queryString = `search=${problem}&resource=1`;
        GM_xmlhttpRequest({
            method: 'GET',
            url: `https://clist.by/problems/?${queryString}`,
            responseType: 'html',
            onload: function(response) {
                const html = response.responseText;
                var cleanedHtml = html.replace(/src=(.|\s)*?"/g, '');
                const trs = $(cleanedHtml).find('table').find('tbody tr');
                let records = [];
                trs.each(function(index) {
                    const rating = $(this).find('.problem-rating-column').text().trim();
                    const link = $(this).find('.problem-name-column').find('a').eq(1).attr('href');
                    var contests = [];
                    $(this).find('.problem-name-column').find('.pull-right a[title], .pull-right span[title]').each(function() {
                        var value = $(this).attr('title');
                        if (value) {
                            value = value.replace(/<br\/?><\/a>/g, '');
                            contests.push(value);
                        }
                    });
                    records.push({ rating: rating, link: link, contests: contests });
                });
                for (let record of records) {
                    let link;
                    if (typeof record.link !== 'undefined') link = record.link.replace(/http:/g, 'https:');
                    if (link == problem_url || link == problem_url + '/') {
                        resolve({
                            rating: parseInt(record.rating),
                            problem: problem
                        });
                        return;
                    } else if (contest != null) {
                        for (let item of record.contests) {
                            if (contest == item) {
                                resolve({
                                    rating: parseInt(record.rating),
                                    problem: problem
                                });
                                return;
                            }
                        }
                    }
                }
                reject('\n' + problem + '未找到该题目的数据\n');
            },
            onerror: function(response) {
                reject(problem + '发生了错误！');
            }
        });
    });
}
// contest页显示Rating
async function showRatingByClist_contest() {
    if (!await checkCookie(true)) return;
    creatRatingCss();

    var clist_event = $('#sidebar').children().first().find('.rtable th').first().text();
    var problemsMap = new Map();
    await new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
            method: "GET",
            url: "https://clist.by/api/v3/contest/?limit=1&resource_id=1&with_problems=true&event=" + encodeURIComponent(clist_event),
            headers: {
                "Authorization": clist_Authorization
            },
            onload: function(response) {
                if (!response) reject('发生了未知错误！');
                var data = JSON.parse(response.responseText);
                var objects = data.objects;
                if (objects.length > 0) {
                    var problems = objects[0].problems;
                    for (var i = 0; i < problems.length; i++) {
                        var problem = problems[i];
                        problemsMap.set(problem.url, problem.rating);
                    }
                    resolve();
                }
            }
        });
    });

    $('.datatable .id.left').each(function() {
        let href = 'https://codeforces.com' + $(this).find('a').attr('href');
        if (problemsMap.has(href)) {
            var rating = problemsMap.get(href);
            let className = "rating_by_clist_color9";
            let keys = Object.keys(ratingClassMap);
            for (let i = 0; i < keys.length; i++) {
                if (rating < keys[i]) {
                    className = ratingClassMap[keys[i - 1]];
                    break;
                }
            }
            $(this).find('a').after(`<div class="ratingBadges ${className}"><span class="rating">${rating}</span></div>`);
        }
    });
}
// problemset页显示Rating
async function showRatingByClist_problemset() {
    if (!await checkCookie()) return;
    creatRatingCss();

    const $problems = $('.problems');
    const $trs = $problems.find('tbody tr:gt(0)');

    for (let i = 0; i < $trs.length; i += 3) {
        const promises = [];
        const endIndex = Math.min(i + 3, $trs.length);

        for (let j = i; j < endIndex; j++) {
            const $tds = $($trs[j]).find('td');
            let problem = $($tds[1]).find('a:first').text();
            let problem_url = $($tds[1]).find('a').attr('href');
            problem_url = problem_url.replace(/^\/problemset\/problem\/(\d+)\/(\w+)/, 'https://codeforces.com/contest/$1/problem/$2');

            promises.push(getRating(problem, problem_url).catch(error => console.warn(error)));
        }

        const results = await Promise.all(promises);

        for (let j = i; j < endIndex; j++) {
            const result = results[j - i];
            if (result == undefined) continue;
            let className = "rating_by_clist_color9";
            let keys = Object.keys(ratingClassMap);
            for (let k = 0; k < keys.length; k++) {
                if (result.rating < keys[k]) {
                    className = ratingClassMap[keys[k - 1]];
                    break;
                }
            }

            const $tds = $($trs[j]).find('td');
            $($tds[0]).find('a').after(`<div class="ratingBadges ${className}"><span class="rating">${result.rating}</span></div>`);
        }

        // 延时100毫秒
        // await new Promise(resolve => setTimeout(resolve, 100));
    }
}
// problem页显示Rating
async function showRatingByClist_problem() {
    if (!await checkCookie()) return;
    creatRatingCss(false);

    // 题目名
    let problem = $('.header .title').eq(0).text().replace(/[\s\S]*?. /, '');
    if (is_acmsguru) problem = $('h4').eq(0).text().replace(/[\s\S]*?. /, '');

    // 题目链接
    let problem_url = window.location.href;
    if (problem_url.includes('/contest/')) {
        problem_url = problem_url.replace(/\/contest\/(\d+)\/problem\/(\w+)[^\w]*/, '/contest/$1/problem/$2');
    } else {
        problem_url = problem_url.replace(/\/problemset\/problem\/(\d+)\/(\w+)/, '/contest/$1/problem/$2');
    }
    if (is_mSite) problem_url = problem_url.replace(/\/\/(\w+).codeforces.com/, '//codeforces.com'); // 轻量站

    // 比赛名
    let contest = $('#sidebar').children().first().find('.rtable th').first().text();

    let result;
    try {
        result = await getRating(problem, problem_url, contest);
    } catch (error) {
        console.warn(error);
        return;
    }

    let className = "rating_by_clist_color9";
    let keys = Object.keys(ratingClassMap);
    for (let i = 0; i < keys.length; i++) {
        if (result.rating < keys[i]) {
            className = ratingClassMap[keys[i - 1]];
            break;
        }
    }
    const RatingHtml = $(`<a id="problemLink" href="https://clist.by/problems/?search=${result.problem}&resource=1" target="_blank">
        <button style="height: 25px;" class="html2mdButton ratingBadges ${className}">
        ${clistIcon}<span style="padding: 1px 0px 0px 5px;">${result.rating}</span></button>
        </a>`);
    if ($('#CF2luoguPanel').length > 0) {
        $('#CF2luoguPanel').append(RatingHtml);
    } else {
        const panelElement = $("<div>")
            .addClass("html2md-panel")
            .attr("id", "CF2luoguPanel");
        if (is_mSite) {
            panelElement.insertBefore('.problem-statement');
        } else {
            panelElement.insertBefore('.problemindexholder');
        }
        panelElement.append(RatingHtml);
    }
}

// cf赛制榜单重新着色
function recolorStandings() {
    function getColorValue(value) {
        value = Math.max(0, Math.min(1, value));

        const scale = chroma.scale(['#b71c1c', '#ff9800', '#ffc107', '#00aa00']).mode('lch').domain([0, 0.45, 0.7, 1]);
        return scale(value).hex();
    }
    var maxScores = $('.standings tr:first th:nth-child(n+5)')
        .map(function() {
            return $(this).find('span').text();
        })
        .get();
    $('.standings tr:not(:first):not(:last)').each(function() {
        var thElements = $(this).find('td:nth-child(n+5)');
        thElements.each(function(index) {
            var spanElement = $(this).find('span:first');
            var value = parseInt(spanElement.text());
            if (value <= 0 || /[a-zA-Z]/.test(maxScores[index])) return;
            var colorValue = getColorValue(value / maxScores[index]);
            spanElement.css('color', colorValue);
        });
    });
}

// 语言切换选项value与ace mode的对应关系
var extensionMap = {
    "43": "program.c", "80": "program.cpp", "52": "program.cpp", "50": "program.cpp", "54": "program.cpp", "73": "program.cpp",
    "59": "program.cpp", "61": "program.cpp", "65": "program.cs", "79": "program.cs", "9": "program.cs", "28": "program.d", "32": "program.go",
    "12": "program.hs", "60": "[^{}]*public\\s+(final)?\\s*class\\s+(\\w+).*|$2.java", "74": "[^{}]*public\\s+(final)?\\s*class\\s+(\\w+).*|$2.java",
    "87": "[^{}]*public\\s+(final)?\\s*class\\s+(\\w+).*|$2.java", "36": "[^{}]*public\\s+(final)?\\s*class\\s+(\\w+).*|$2.java", "77": "program.kt",
    "83": "program.kt", "19": "program.ml", "3": "program.dpr", "4": "program.pas", "51": "program.pas", "13": "program.pl", "6": "program.php",
    "7": "program.py", "31": "a.py", "40": "a.py", "41": "a.py", "70": "a.py", "67": "program.rb", "75": "program.rs",
    "20": "[^{}]*object\\s+(\\w+).*|$1.scala", "34": "program.js", "55": "program.js"
};


// 更新代码提交页的HTML元素
async function CloneOriginalHTML(submitUrl, cacheKey) {
    return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
            method: 'GET',
            url: submitUrl,
            responseType: 'html',
            onload: function(response) {
                const html = response.responseText;
                const cloneHTML = $(html);
                localStorage.setItem(cacheKey, html);

                // 更新，防止为旧的csrf
                let _token = cloneHTML.find('form.submit-form').attr('action');
                $('#CFBetter_SubmitForm').attr('action', submitUrl + _token);
                CF_csrf_token = _token.match(/(?<=\?csrf_token=)[^&]+/)?.[0];

                resolve(cloneHTML);
            },
            onerror: function(response) {
                reject('网络错误');
            }
        });
    });
}

// 获取代码提交页的HTML元素
async function getSubmitHTML(submitUrl) {
    const cacheKey = 'CFBetter_CloneOriginalHTML';
    const cookieKey = 'CFBetter_CloneOriginalHTML_time';
    if (getCookie(cookieKey) === '1') {
        // 存在缓存
        CloneOriginalHTML(submitUrl, cacheKey);
        // 校验
        let cloneHTML = $(localStorage.getItem(cacheKey));
        if (cloneHTML.find('form.submit-form').length > 0) {
            // 获取csrf_token
            let _token = cloneHTML.find('form.submit-form').attr('action');
            CF_csrf_token = _token.match(/(?<=\?csrf_token=)[^&]+/)?.[0];
            return cloneHTML;
        } else {
            // 存在错误，更新缓存
            console.log("%c缓存存在错误，正在尝试更新", "color:blue;")
            return await CloneOriginalHTML(submitUrl, cacheKey);
        }

    } else {
        // 没有缓存，更新
        document.cookie = `${cookieKey}=1; path=/`;
        return await CloneOriginalHTML(submitUrl, cacheKey);
    }
}

// 代码自动保存
async function saveCode(url, code) {
    try {
        await CFBetterDB.editorCode.put({ url, code });
        return 'Code saved successfully';
    } catch (error) {
        throw new Error('Failed to save code');
    }
}

async function getCode(url) {
    try {
        const result = await CFBetterDB.editorCode.get(url);
        return result ? result.code : null;
    } catch (error) {
        throw new Error('Failed to get code');
    }
}

// 创建表单
async function CreateCodeDevFrom(submitUrl, cloneHTML) {
    // 表单
    var formDiv = $('<form method="post" id="CFBetter_SubmitForm"></form>');
    $('.ttypography').after(formDiv);
    let _action = cloneHTML.find('form.submit-form').attr('action');
    formDiv.attr('action', submitUrl + _action);

    // 顶部区域
    var topDiv = $(`<div style="display:flex;align-items: center;justify-content: space-between;"></div>`)
    let selectLang = cloneHTML.find('select[name="programTypeId"]'); // 编辑器语言选择
    selectLang.css({ 'margin': '10px 0px' }).attr('id', 'programTypeId');
    topDiv.append(selectLang);
    formDiv.append(topDiv);

    // 问题选择/编号
    var selectProblem = $('<input name="submittedProblemIndex" style="display:none;"></input>');
    let problemCode;
    if (is_acmsguru) {
        problemCode = $('h4').eq(0).text();
        let matchResult = problemCode.match(/([A-Z])/);
        problemCode = matchResult[0];
    } else if (is_problemset_problem) {
        let match = window.location.href.match(/\/problem\/([0-9]+?)\/([A-Z]+?)$/);
        problemCode = match[1] + match[2];
        selectProblem.attr('name', 'submittedProblemCode');
    } else {
        problemCode = $('.header .title').eq(0).text();
        let matchResult = problemCode.match(/([A-Z])/);
        problemCode = matchResult[0];
    }
    selectProblem.val(problemCode);
    formDiv.append(selectProblem);

    // 隐藏的代码记录
    var sourceDiv = $('<textarea id="sourceCodeTextarea" name="source" style="display: none;"></textarea>');
    formDiv.append(sourceDiv);

    // 代码编辑器
    var editorDiv = $('<div id="CFBetter_editor" style="height:600px"></div>');
    formDiv.append(editorDiv);
    editor = ace.edit('CFBetter_editor');
    editor.$blockScrolling = Infinity;// 禁用滚动警告
    editor.setTheme('ace/theme/textmate'); // 主题
    editor.setShowPrintMargin(false); // 不显示打印边距
    editor.setFontSize(parseInt(editorFontSize)); // 字体大小
    if (keywordAutoComplete) {
        editor.setOptions({
            enableBasicAutocompletion: true,
            enableLiveAutocompletion: true,
            enableSnippets: true
        });
    }
    editor.setOption("tabSize", parseInt(indentSpacesCount)); // 缩进空格数
    // tab行为
    if (howToIndent == "space") editor.setOption("useSoftTabs", true);
    else editor.setOption("useSoftTabs", false);
    // 自动换行
    editor.setOption("wrap", isWrapEnabled ? "free" : "off");

    // 调整字体大小
    var changeSize = $(`<div><label for="fontSizeInput">字体大小：</label><input type="number" id="fontSizeInput" value="${editorFontSize}"></div>`)
    topDiv.append(changeSize);
    changeSize.find('input#fontSizeInput').on('input', function() {
        var size = $(this).val();
        editor.setFontSize(parseInt(size));
        GM_setValue('editorFontSize', size);
    });

    // 代码同步与保存
    const nowUrl = window.location.href;
    const code = await getCode(nowUrl);
    if (code) {
        editor.setValue(code, 1); // 恢复代码
        $('#sourceCodeTextarea').val(code);
    }
    editor.scrollToRow(editor.session.getLength() - 1); // 滚动到最后一行
    editor.getSession().on('change', async function() {
        const code = editor.getValue();
        $('#sourceCodeTextarea').val(code); // 将ace editor的内容同步到sourceCodeTextarea
        await saveCode(nowUrl, code);
    });

    // 自定义调试
    var customTestDiv = $(`
        <details id="customTestBlock">
            <summary >自定义测试数据(自动保存)</summary>
            <div id="customTests" style="min-height: 30px;"></div>
            <div id="control" style="display:flex;">
                <div style="display: flex;margin: 5px;">
                    <input type="checkbox" id="onlyCustomTest"}><label for="onlyCustomTest">只测试自定义数据</label>
                </div>
                <div style="display: flex;margin: 5px;">
                    <input type="checkbox" id="DontShowDiff"}><label for="DontShowDiff">不显示差异对比</label>
                </div>
                <div style="display: flex;margin: 5px;">
                    <input type="checkbox" id="secureSubmit"}><label for="secureSubmit">防止误提交(勾选后不能点击提交按钮)</label>
                </div>
                <button type="button" id="addCustomTest">新建</button>
            </div>
        </details>
    `)
    formDiv.append(customTestDiv);

    // 调试/提交
    var submitDiv = $('<div id="CFBetter_submitDiv"></div>');
    var CompilerSetting = $('<div id="CompilerSetting"><input type="text" id="CompilerArgsInput"></div>');
    submitDiv.append(CompilerSetting);
    var runButton = $('<button class="CFBetter_SubmitButton" id="RunTestButton">样例测试</button>');
    submitDiv.append(runButton);
    var submitButton = $('<input class="CFBetter_SubmitButton" id="SubmitButton" type="submit" value="提交">');
    submitDiv.append(submitButton);
    formDiv.append(submitDiv);

    var from = {
        formDiv: formDiv,
        selectLang: selectLang,
        sourceDiv: sourceDiv,
        editor: editor,
        runButton: runButton,
        submitButton: submitButton,
        submitDiv: submitDiv
    };
    return from;
}

// 语言更改
function changeAceLanguage(selectLang, editor) {
    let nowSelect = selectLang.val();
    // 记忆更改
    GM_setValue('compilerSelection', nowSelect);
    // 编辑器
    var filePath = extensionMap[nowSelect];
    var modelist = ace.require("ace/ext/modelist");
    var mode = modelist.getModeForPath(filePath).mode;
    editor.session.setMode(mode);
    // 调试器
    changeCompilerArgs(nowSelect);
}

// 自动补全器更新
function updateAutocomplete() {
    if (!keywordAutoComplete) return;
    let extraCompleters = [];
    let langTools = ace.require('ace/ext/language_tools');
    if (editor.getSession().getMode().$id === "ace/mode/c_cpp") {
        extraCompleters.push(langTools.textCompleter); // 本地补全
        if (cppCodeTemplateComplete) extraCompleters.push(CODE_COMPLETER); // acwing补全规则
        else {
            extraCompleters.push(langTools.keyWordCompleter);
            extraCompleters.push(langTools.snippetCompleter);
        }
        editor.completers = extraCompleters;
    } else {
        extraCompleters.push(langTools.textCompleter);
        extraCompleters.push(langTools.keyWordCompleter);
        extraCompleters.push(langTools.snippetCompleter);
        editor.completers = extraCompleters;
    }
}

// 收集样例数据
function collectTestData() {
    var testData = {};

    $('.input').each(function(index) {
        var inputText = '';
        if ($(this).find('pre').find('div').length > 0) {
            $(this).find('pre').find('div').each(function() {
                inputText += $(this).text() + '\n';
            });
        } else {
            inputText = $(this).find('pre').text();
        }
        var outputText = '';
        if ($('.output').eq(index).find('pre').find('div').length > 0) {
            $('.output').eq(index).find('pre').find('div').each(function() {
                inputText += $(this).text() + '\n';
            });
        } else {
            outputText = $('.output').eq(index).find('pre').text();
        }

        testData[index + 1] = {
            input: inputText.trim(),
            output: outputText.trim()
        };
    });

    return testData;
}

// 初始化自定义测试数据面板
function CustomTestInit() {
    const url = window.location.href;

    restoreText();

    // 添加
    $('#addCustomTest').click(function() {
        var sampleDiv = $('<div class="sampleDiv">');
        var inputTextarea = $('<p style="padding: 0px 5px;">input</p><textarea class="dynamicTextarea inputTextarea"></textarea>');
        var outputTextarea = $('<p style="padding: 0px 5px;">output</p><textarea class="dynamicTextarea outputTextarea"></textarea>');
        var deleteCustomTest = $(`<button type="button" class="deleteCustomTest">${closeIcon}</button>`);
        sampleDiv.append(deleteCustomTest);
        sampleDiv.append(inputTextarea);
        sampleDiv.append(outputTextarea);
        $('#customTests').append(sampleDiv);
    });

    // 实时保存文本内容到 IndexedDB 中
    $(document).on('input', '.inputTextarea, .outputTextarea', function() {
        CFBetterDB.transaction('rw', CFBetterDB.samplesData, function() {
            var objectStore = CFBetterDB.samplesData;
            var samples = {
                url: url,
                samples: []
            };
            var index = 0;
            $('.sampleDiv').each(function() {
                var $sampleDiv = $(this);
                var inputTextarea = $sampleDiv.find('.inputTextarea');
                var outputTextarea = $sampleDiv.find('.outputTextarea');
                $sampleDiv.attr('data-index', index);
                inputTextarea.attr('id', 'input' + index);
                outputTextarea.attr('id', 'output' + index);
                var sample = {
                    id: index,
                    input: inputTextarea.val(),
                    output: outputTextarea.val()
                };
                samples.samples.push(sample);
                index++;
            });
            objectStore.put(samples);
        });
    });

    // 删除
    $(document).on('click', '.deleteCustomTest', function() {
        var $sampleDiv = $(this).closest('.sampleDiv');
        CFBetterDB.transaction('rw', CFBetterDB.samplesData, function() {
            var objectStore = CFBetterDB.samplesData;
            var index = parseInt($sampleDiv.attr('data-index'));
            if (!isNaN(index)) {
                objectStore.get(url).then(row => {
                    let samples = row.samples;
                    samples.splice(index, 1); // 移除第index个元素
                    objectStore.put({
                        url: url,
                        samples: samples
                    });
                })
            }
            $sampleDiv.remove();
        });
    });

    // 恢复保存的内容
    function restoreText() {
        CFBetterDB.transaction('r', CFBetterDB.samplesData, function() {
            return CFBetterDB.samplesData.get(url);
        }).then(function(data) {
            if (data.samples && data.samples.length > 0) {
                data.samples.forEach(function(item, index) {
                    var sampleDiv = $('<div class="sampleDiv">');
                    var inputTextarea = $(`<p style="padding: 0px 5px;">input</p><textarea id="input${index}" class="dynamicTextarea inputTextarea"></textarea>`);
                    var outputTextarea = $(`<p style="padding: 0px 5px;">output</p><textarea id="output${index}" class="dynamicTextarea outputTextarea"></textarea>`);
                    var deleteCustomTest = $(`<button type="button" class="deleteCustomTest">${closeIcon}</button>`);

                    inputTextarea.val(item.input);
                    outputTextarea.val(item.output);

                    sampleDiv.append(deleteCustomTest);
                    sampleDiv.append(inputTextarea);
                    sampleDiv.append(outputTextarea);
                    sampleDiv.attr('data-index', index)
                    $('#customTests').append(sampleDiv);
                });
            }
        });
    }
}

// 获取自定义测试数据
function getCustomTestData() {
    const url = window.location.href;

    return new Promise(function(resolve) {
        var customTestData = {};
        CFBetterDB.transaction('r', CFBetterDB.samplesData, function() {
            return CFBetterDB.samplesData.get(url);
        }).then(function(data) {
            if (!data) resolve(customTestData);
            if (data.samples && data.samples.length > 0) {
                data.samples.forEach(function(item, index) {
                    customTestData[index + 1] = {
                        input: item.input,
                        output: item.output
                    };
                });
            }
            resolve(customTestData);
        });
    });
}

// codeforces编译器参数列表
let officialLanguage = "";
function officialCompilerArgsChange(nowSelect) {
    officialLanguage = nowSelect;
    $('#CompilerArgsInput').prop("disabled", true);
}

// codeforces编译器通信
async function officialCompiler(code, input) {
    var data = new FormData();
    data.append('csrf_token', CF_csrf_token);
    data.append('source', code);
    data.append('tabSize', '4');
    data.append('programTypeId', officialLanguage);
    data.append('input', input);
    data.append('output', '');
    data.append('communityCode', '');
    data.append('action', 'submitSourceCode');
    data.append('programTypeId', officialLanguage);
    data.append('sourceCode', code);
    var result = {
        Errors: '',
        Result: '',
        Stats: ''
    };

    return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
            method: 'POST',
            url: hostAddress + '/data/customtest',
            data: data,
            headers: {
                'X-Csrf-Token': CF_csrf_token
            },
            onload: function(responseDetails) {
                if (responseDetails.status !== 200 || !responseDetails.response) {
                    result.Errors = `提交代码到 codeforces 服务器时发生了错误，请重试 ${findHelpText}`;
                    resolve(result);
                } else {
                    try {
                        const response = JSON.parse(responseDetails.response);
                        resolve(response.customTestSubmitId);
                    } catch (error) {
                        result.Errors = `解析响应数据 customTestSubmitId 时发生了错误，请重试 ${findHelpText}`;
                        resolve(result);
                    }
                }
            },
            onerror: function() {
                result.Errors = '请求 customTestSubmitId 时网络错误';
                resolve(result);
            }
        });
    }).then(customTestSubmitId => {
        if (result.Errors !== '') return result; // 产生了错误，直接返回
        return new Promise((resolve, reject) => {
            let retryCount = 0;
            var newdata = new FormData();
            newdata.append('csrf_token', CF_csrf_token);
            newdata.append('action', 'getVerdict');
            newdata.append('customTestSubmitId', customTestSubmitId);
            function makeRequest() {
                GM_xmlhttpRequest({
                    method: 'POST',
                    url: hostAddress + '/data/customtest',
                    data: newdata,
                    headers: {
                        'X-Csrf-Token': CF_csrf_token
                    },
                    onload: function(responseDetails) {
                        if (responseDetails.status !== 200 || !responseDetails.response) {
                            result.Errors = `请求运行结果时发生了错误，请重试 ${findHelpText}`;
                            resolve(result);
                        } else {
                            try {
                                const response = JSON.parse(responseDetails.response);
                                if (!response.stat && retryCount < 10) {
                                    retryCount++;
                                    setTimeout(makeRequest, 1000);
                                } else if (retryCount >= 5) {
                                    result.Errors = `结果获取已超时，请重试 ${findHelpText}`;
                                    resolve(result);
                                } else {
                                    const result = {
                                        Errors: response.verdict == "OK" ? null : response.verdict + '<br>' + response.output,
                                        Result: response.output.replace(/\r\n/g, "\n"),
                                        Stats: `Status: ${response.stat}`
                                    };
                                    resolve(result);
                                }
                            } catch (error) {
                                result.Errors = '请求运行结果时响应数据解析错误';
                                resolve(result);
                            }
                        }
                    },
                    onerror: function() {
                        result.Errors = '请求运行结果时网络错误';
                        resolve(result);
                    }
                });
            }

            makeRequest();
        });
    });
}

// rextester编译器参数列表
let rextesterLanguage = "", rextesterCompilerArgs = "";
function rextesterCompilerArgsChange(nowSelect) {
    let LanguageChoiceList = {
        "4": "9", "6": "8", "7": "5", "9": "1", "13": "13", "19": "42", "20": "21", "28": "30", "31": "24", "32": "20",
        "34": "17", "36": "4", "43": "6", "45": "7", "46": "4", "50": "7", "51": "9", "52": "27", "54": "7", "55": "23", "60": "4",
        "61": "7", "65": "1", "67": "12", "70": "5", "73": "7", "74": "4", "75": "46", "77": "43", "79": "1", "80": "27", "83": "43", "87": "4"
    }
    let CompilerArgsList = {
        "6": "-Wall -std=gnu99 -O2 -o a.out source_file.c",
        "7": "-Wall -std=c++14 -O2 -o a.out source_file.cpp",
        "20": "-o a.out source_file.go",
        "27": "-Wall -std=c++14 -stdlib=libc++ -O2 -o a.out source_file.cpp",
        "30": "source_file.d -ofa.out"
    }
    if (nowSelect in LanguageChoiceList) {
        $('#RunTestButton').prop("disabled", false);
        rextesterLanguage = LanguageChoiceList[nowSelect];
    } else {
        $('#RunTestButton').prop("disabled", true);
    }
    if (rextesterLanguage in CompilerArgsList) {
        rextesterCompilerArgs = CompilerArgsList[rextesterLanguage];
        $('#CompilerArgsInput').val(rextesterCompilerArgs);
    } else {
        $('#CompilerArgsInput').val("");
    }
}

// rextester编译器通信
async function rextesterCompiler(code, input) {
    var data = new FormData();
    data.append('LanguageChoiceWrapper', rextesterLanguage);
    data.append('EditorChoiceWrapper', '1');
    data.append('LayoutChoiceWrapper', '1');
    data.append('Program', code);
    data.append('CompilerArgs', rextesterCompilerArgs);
    data.append('Input', input);
    data.append('ShowWarnings', 'false');
    data.append('IsInEditMode', 'false');
    data.append('IsLive', 'false');
    var result = {
        Errors: '',
        Result: '',
        Stats: ''
    };

    return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
            method: 'POST',
            url: 'https://rextester.com/rundotnet/Run',
            data: data,
            onload: function(responseDetails) {
                if (responseDetails.status !== 200 || !responseDetails.response) {
                    result.Errors = `发生了未知的错误，请重试 ${findHelpText}`;
                    resolve(result);
                } else {
                    try {
                        const response = JSON.parse(responseDetails.response);
                        result.Errors = response.Errors;
                        result.Result = response.Result;
                        result.Stats = response.Stats;
                        resolve(result);
                    } catch (error) {
                        result.Errors = '响应数据解析错误';
                        resolve(result);
                    }
                }
            },
            onerror: function() {
                result.Errors = '网络错误';
                resolve(result);
            }
        });
    });
}

// codechef编译器参数列表
let codechefLanguage = "";
function codechefCompilerArgsChange(nowSelect) {
    let LanguageChoiceList = {
        "6": "29", "9": "27", "32": "114", "34": "56", "36": "10", "41": "109", "43": "44", "50": "44",
        "52": "63", "54": "63", "60": "10", "61": "63", "65": "27", "70": "109", "73": "63", "74": "10", "75": "93", "77": "47",
        "79": "27", "80": "63", "83": "47", "87": "10"
    }
    if (nowSelect in LanguageChoiceList) {
        $('#RunTestButton').prop("disabled", false);
        codechefLanguage = LanguageChoiceList[nowSelect];
    } else {
        $('#RunTestButton').prop("disabled", true);
    }
    $('#CompilerArgsInput').prop('disabled', true);
}

// codechef编译器通信
async function codechefCompiler(code, input) {
    const data = new URLSearchParams();
    data.append('sourceCode', code);
    data.append('language', codechefLanguage);
    data.append('input', input);
    var result = {
        Errors: '',
        Result: '',
        Stats: ''
    };
    return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
            method: 'POST',
            url: 'https://www.codechef.com/api/ide/run/all',
            data: data.toString(),
            headers: {
                'Accept': 'application/json, text/javascript, */*; q=0.01',
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'X-Csrf-Token': codecheCsrfToken
            },
            onload: function(responseDetails) {
                if (responseDetails.status !== 200 || !responseDetails.response) {
                    result.Errors = `提交代码到 codechef 服务器时发生了错误，请重试 ${findHelpText}`;
                    resolve(result);
                } else {
                    try {
                        const response = JSON.parse(responseDetails.response);
                        resolve(response.timestamp);
                    } catch (error) {
                        result.Errors = `解析响应数据 timestamp 时发生了错误，请重试 ${findHelpText}`;
                        resolve(result);
                    }
                }
            },
            onerror: function() {
                result.Errors = '请求 timestamp 时网络错误';
                resolve(result);
            }
        });
    }).then(timestamp => {
        if (result.Errors !== '') return result; // 产生了错误，直接返回
        return new Promise((resolve, reject) => {
            let retryCount = 0;

            function makeRequest() {
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: `https://www.codechef.com/api/ide/run/all?timestamp=${timestamp}`,
                    headers: {
                        'Accept': 'application/json, text/javascript, */*; q=0.01',
                        'X-Csrf-Token': codecheCsrfToken
                    },
                    onload: function(responseDetails) {
                        if (responseDetails.status !== 200 || !responseDetails.response) {
                            result.Errors = `请求运行结果时发生了错误，请重试 ${findHelpText}`;
                            resolve(result);
                        } else {
                            try {
                                const response = JSON.parse(responseDetails.response);
                                if (response.result === 0 && retryCount < 5) {
                                    retryCount++;
                                    setTimeout(makeRequest, 500);
                                } else if (retryCount >= 5) {
                                    result.Errors = `结果获取已超时，请重试 ${findHelpText}`;
                                    resolve(result);
                                } else {
                                    const result = {
                                        Errors: response.stderr == "" ? null : response.stderr,
                                        Result: response.output,
                                        Stats: `Status: ${response.status} Time: ${response.time} Mem: ${response.memory} kB`
                                    };
                                    resolve(result);
                                }
                            } catch (error) {
                                result.Errors = '请求运行结果时响应数据解析错误';
                                resolve(result);
                            }
                        }
                    },
                    onerror: function() {
                        result.Errors = '请求运行结果时网络错误';
                        resolve(result);
                    }
                });
            }

            makeRequest();
        });
    });
}

// wandbox编译器参数列表
var wandboxlist = JSON.parse(GM_getResourceText("wandboxlist"));
function wandboxCompilerArgsChange(nowSelect) {
    let LanguageChoiceList = {
        "6": "PHP", "7": "Python", "9": "C#", "12": "Haskell", "13": "Perl", "19": "OCaml",
        "20": "Scala", "28": "D", "31": "Python", "32": "Go", "34": "JavaScript", "36": "Java", "40": "Python", "41": "Python",
        "43": "C++", "50": "C++", "51": "Pascal", "52": "C++", "54": "C++", "60": "Java", "61": "C++", "65": "C#", "67": "Ruby",
        "70": "Python", "73": "C++", "74": "Java", "75": "Rust", "79": "C#", "80": "C++", "87": "Java"
    }
    if (nowSelect in LanguageChoiceList) {
        $('#RunTestButton').prop("disabled", false);
        const Languagefiltered = wandboxlist.filter(obj => obj.language === LanguageChoiceList[nowSelect]);

        // 创建编辑器下拉框
        var CompilerChange = $('<select id="CompilerChange" style="width: 100%;"></select>');
        $('#CompilerSetting').append(CompilerChange);
        for (let i = 0; i < Languagefiltered.length; i++) {
            let Compiler = Languagefiltered[i];
            let op = $("<option></option>")
                .val(Compiler.name)
                .text(Compiler["display-name"] + " " + Compiler.version);
            $("#CompilerChange").append(op);
        }

        // 编辑器参数刷新
        function refreshCompilerArgs() {
            var flags = '';
            $("#CompilerBox").find("*").each(function() {
                if ($(this).is("input[type='checkbox']")) {
                    let flag = $(this).prop("checked") ? $(this).val() : '';
                    flags += flag + (flag ? ' ' : '');
                } else if ($(this).is("select") || $(this).is("input") || $(this).is("textarea")) {
                    let flag = $(this).val();
                    flags += flag + (flag ? ' ' : '');
                }
            });
            $("#CompilerArgsInput").val(flags);
            $("#CompilerArgsInput").prop("readonly", true); // 只读
        }

        // 编辑器切换监听
        CompilerChange.change(function() {
            let selectedName = $(this).val();
            let Compiler = Languagefiltered.find(
                (obj) => obj.name === selectedName
            );

            $("#CompilerArgsInput").val(); // 初始化编译器输入框

            $("#CompilerBox").remove();
            let div = $("<div id='CompilerBox'></div>");

            let display_compile_command = $(`<input id='${Compiler.name}' value='${Compiler['display-compile-command']}' style="display:none;"}></input>`);
            div.append(display_compile_command);

            let switches = Compiler.switches;
            for (let i = 0; i < switches.length; i++) {
                let switche = switches[i];

                if (switche.type == "single") {
                    let single = $(`
                    <div>
                        <input type='checkbox' id='${switche.name}' value='${switche['display-flags']}' ${switche.default ? 'checked' : ''}></input>
                        <label for='${switche.name}'>${switche['display-name']}</label>
                    </div>
                    `);
                    div.append(single);
                    single.find("input").change(function() {
                        refreshCompilerArgs();
                    });
                } else if (switche.type == "select") {
                    let select = $(`<select id='${switche.name}'></select>`);
                    select.data('previousValue', switche.options[0]['display-flags']);
                    div.append(select);
                    for (let i = 0; i < switche.options.length; i++) {
                        let option = switche.options[i];
                        let op = $("<option></option>")
                            .val(option['display-flags'])
                            .text(option['display-name']);
                        select.append(op);
                    }
                    select.change(function() {
                        refreshCompilerArgs();
                    });
                }
            }

            if (Compiler['compiler-option-raw'] == true) {
                let textarea = $(`<textarea id="compiler_option_raw" placeholder="Raw compiler options" style="resize: vertical;"></textarea>`);
                div.append(textarea);
                textarea.on('input', function() {
                    refreshCompilerArgs();
                });
            }
            if (Compiler['runtime-option-raw'] == true) {
                let textarea = $(`<textarea id="runtime_option_raw" placeholder="Raw runtime options" style="resize: vertical;"></textarea>`);
                div.append(textarea);
                textarea.on('input', function() {
                    refreshCompilerArgs();
                });
            }
            $("#CompilerSetting").append(div);

            refreshCompilerArgs();  // 初始化
        });

        CompilerChange.trigger("change"); // 初始化
    } else {
        $('#RunTestButton').prop("disabled", true);
    }
}

// wandbox编译器通信
async function wandboxCompiler(code, input) {
    var data = {
        code: code,
        codes: [],
        compiler: $('#CompilerChange').val().replace($('#compiler_option_raw').val(), '').replace($('#runtime_option_raw').val(), ''),
        'compiler-option-raw': $('#compiler_option_raw').val(),
        'runtime-option-raw': $('#runtime_option_raw').val(),
        options: $("#CompilerArgsInput").val(),
        description: '',
        stdin: input,
        title: ''
    }
    var result = {
        Errors: '',
        Result: '',
        Stats: ''
    };

    return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
            method: 'POST',
            url: 'https://wandbox.org/api/compile.json',
            data: JSON.stringify(data),
            onload: function(responseDetails) {
                if (responseDetails.status !== 200 || !responseDetails.response) {
                    result.Errors = `发生了未知的错误，请重试 ${findHelpText}`;
                    resolve(result);
                } else {
                    try {
                        const response = JSON.parse(responseDetails.response);
                        result.Errors = response.compiler_error == "" ? response.signal : response.compiler_error;
                        result.Result = response.program_output;
                        result.Stats = response.status == "0" ? "Finish" : "Error";
                        resolve(result);
                    } catch (error) {
                        result.Errors = '响应数据解析错误';
                        resolve(result);
                    }
                }
            },
            onerror: function() {
                result.Errors = '网络错误';
                resolve(result);
            }
        });
    });
}

// 编译器参数
function changeCompilerArgs(nowSelect) {
    if (onlineCompilerChoice == "official") {
        officialCompilerArgsChange(nowSelect);
    } else if (onlineCompilerChoice == "rextester") {
        rextesterCompilerArgsChange(nowSelect);
    } else if (onlineCompilerChoice == "codechef") {
        codechefCompilerArgsChange(nowSelect);
    } else if (onlineCompilerChoice == "wandbox") {
        wandboxCompilerArgsChange(nowSelect);
    }
}

// 在线编译器通信
async function onlineCompilerConnect(code, input) {
    if (onlineCompilerChoice == "official") {
        return await officialCompiler(code, input);
    } else if (onlineCompilerChoice == "rextester") {
        return await rextesterCompiler(code, input);
    } else if (onlineCompilerChoice == "codechef") {
        return await codechefCompiler(code, input);
    } else if (onlineCompilerChoice == "wandbox") {
        return await wandboxCompiler(code, input);
    }
}

// 差异对比
function codeDiff(expectedText, actualText) {
    // 将文本按行拆分
    var expectedLines = expectedText.split('\n');
    var actualLines = actualText.split('\n');

    var output = $('<div>');
    for (var i = 0; i < expectedLines.length; i++) {
        var expectedLine = expectedLines[i];
        var actualLine = actualLines[i];
        var LineDiv = $(`<div class="DiffLine"><span class="LineNo">${i + 1}</span></div>`);
        if (actualLine == undefined) {
            LineDiv.append(`<span class="added">${expectedLine}</span>`);
        } else {
            let div = $('<div class="LineContent">');
            if (expectedLine === actualLine) {
                div.append(`<span style="padding-left:3px;">${actualLine}</span>`);
            } else {
                div.append(`<span class="removed" style="padding-left:3px;">${actualLine}</span>`);
                div.append(`<span class="added" style="padding-left:3px;">${expectedLine}</span>`);
            }
            LineDiv.append(div);
        }
        output.append(LineDiv);
    }

    // 处理多余的 actualLines
    for (var j = expectedLines.length; j < actualLines.length; j++) {
        output.append(`<span class="removed" style="padding-left:3px;">${actualLines[j]}</span>`);
    }

    return output.html();
}

// 样例测试函数
async function runCode(event, sourceDiv, submitDiv) {
    event.preventDefault();
    const loadingImage = $('<img class="CFBetter_loding" src="//codeforces.org/s/84141/images/ajax-loading-24x24.gif">');
    $('#RunTestButton').after(loadingImage);
    $('#statePanel').remove(); // 移除旧结果

    // 评测结果面板
    var statePanel = $(`<div id="statePanel">`);
    submitDiv.after(statePanel);

    // 更新状态
    rextesterCompilerArgs = $('#CompilerArgsInput').val();

    // 获取数据
    const testData = collectTestData();
    const customtestData = await getCustomTestData();

    // 测试
    const handleResult = (prefix, data, item, result) => {
        if (result.Errors) {
            statePanel.append($(`<div class="RunState_title error">${prefix}${item} Compilation error or Time limit</div>`));
            // 渲染终端转义序列
            GM_addStyle(GM_getResourceText("xtermcss"));
            let terminalContainer = $(`<div id="terminal-container" style="overflow: auto;margin-bottom: 5px;"></div>`);
            statePanel.append(terminalContainer);
            const term = new Terminal({
                rows: 10,
                cols: 150
            });
            term.setOption('theme', {
                background: '#2d2e2c',
            });
            term.setOption('convertEol', true); // 将\n转换为\r\n
            term.write(result.Errors);
            term.open(terminalContainer.get(0));
        } else if (result.Result.trim() === data.output.trim()) {
            statePanel.append($(`<div class="RunState_title ok">${prefix}${item} Accepted</div>`));
        } else {
            statePanel.append($(`<div class="RunState_title error">${prefix}${item} Wrong Answer</div>`));
            if ($('#DontShowDiff').prop('checked')) statePanel.append($(`<div class="outputDiff" style="white-space: break-spaces;">${result.Result.trim()}</div>`));
            else statePanel.append($(`<p>差异对比：</p><div class="outputDiff">${codeDiff(data.output.trim(), result.Result.trim())}</div>`));
        }
        statePanel.append($(`<div style="color:${result.Errors ? 'red' : ''};">状态： ${result.Stats}</div>`));
    };

    // 遍历数据并测试
    for (const [item, data] of Object.entries(customtestData)) {
        await new Promise(resolve => setTimeout(resolve, 500)); // 延迟500毫秒
        const result = await onlineCompilerConnect(sourceDiv.val(), data.input);
        handleResult('自定义样例', data, item, result);
    }

    if (!$('#onlyCustomTest').prop('checked')) {
        for (const [item, data] of Object.entries(testData)) {
            await new Promise(resolve => setTimeout(resolve, 500)); // 延迟500毫秒
            const result = await onlineCompilerConnect(sourceDiv.val(), data.input);
            handleResult('题目样例', data, item, result);
        }
    }

    loadingImage.remove();
}

async function addProblemPageCodeEditor() {
    if (typeof ace === 'undefined') {
        console.log("%c未找到ace，当前可能为非题目页或者比赛刚刚结束", "border:1px solid #000;padding:10px;");
        return; // 未登录，不存在ace库
    }

    const href = window.location.href;
    let submitUrl = /\/problemset\//.test(href) ? hostAddress + '/problemset/submit' :
        href.replace(/\/problem[A-Za-z0-9\/#]*/, "/submit");
    let cloneHTML = await getSubmitHTML(submitUrl);

    // 创建
    let from = await CreateCodeDevFrom(submitUrl, cloneHTML);
    let editor = from.editor;
    let selectLang = from.selectLang;
    let submitButton = from.submitButton;
    let runButton = from.runButton;

    CustomTestInit(); // 初始化自定义测试数据面板
    selectLang.on('change', () => changeAceLanguage(from.selectLang, from.editor)); // 编辑器语言切换监听
    editor.getSession().on("changeMode", updateAutocomplete); // 切换语言监听，更新自动补全

    // 样例测试
    runButton.on('click', (event) => runCode(event, from.sourceDiv, from.submitDiv));

    // 提交
    submitButton.on('click', function(event) {
        event.preventDefault();
        if (!$('#secureSubmit').prop('checked')) {
            submitButton.after(`<img class="CFBetter_loding" src="//codeforces.org/s/84141/images/ajax-loading-24x24.gif">`);
            $('#CFBetter_SubmitForm').submit();
        } else {
            submitButton.addClass('disabled');
            setTimeout(function() {
                submitButton.removeClass('disabled');
            }, 300);
        }
    });

    // 初始化
    selectLang.val(compilerSelection);
    changeAceLanguage(from.selectLang, from.editor);
    updateAutocomplete();
}

// 等待LaTeX渲染队列全部完成
function waitUntilIdleThenDo(callback) {
    var intervalId = setInterval(function() {
        var queue = MathJax.Hub.queue;
        if (queue.pending === 0 && queue.running === 0) {
            clearInterval(intervalId);
            callback();
        }
    }, 100);
}

// 字数超限确认
function showWordsExceededDialog(button, textLength, realTextLength) {
    return new Promise(resolve => {
        const styleElement = GM_addStyle(darkenPageStyle);
        $(button).removeClass("translated");
        $(button).text("字数超限");
        $(button).css("cursor", "not-allowed");
        $(button).prop("disabled", true);
        let htmlString = `
      <div class="CFBetter_modal">
          <h2>字符数超限! </h2>
          <p>即将翻译的内容共 <strong>${realTextLength}</strong> 字符</p>
          <p>这超出了当前翻译服务的 <strong>${textLength}</strong> 字符上限，请更换翻译服务，或在设置面板中开启“分段翻译”</p>

          <div style="display:flex; padding:5px 0px; align-items: center;">
            ${helpCircleHTML}
            <p>
            注意，可能您选择了错误的翻译按钮<br>
            由于实现方式，区域中会出现多个翻译按钮，请点击更小的子区域中的翻译按钮
            </p>
          </div>
          <p>您确定要继续翻译吗？</p>
          <div class="buttons">
            <button id="continueButton">继续</button><button id="cancelButton">取消</button>
          </div>
      </div>
      `;
        $('body').before(htmlString);
        $("#continueButton").click(function() {
            $(styleElement).remove();
            $('.CFBetter_modal').remove();
            resolve(true);
        });
        $("#cancelButton").click(function() {
            $(styleElement).remove();
            $('.CFBetter_modal').remove();
            resolve(false);
        });
    });
}

//跳过折叠块确认
function skiFoldingBlocks() {
    return new Promise(resolve => {
        const styleElement = GM_addStyle(darkenPageStyle);
        let htmlString = `
      <div class="CFBetter_modal">
          <h2>是否跳过折叠块？</h2>
          <p></p>
          <div style="display:grid; padding:5px 0px; align-items: center;">
            <p>
            即将翻译的区域中包含折叠块，折叠块可能是代码，通常不需要翻译，现在您需要选择是否跳过这些折叠块，
            </p>
            <p>
            如果其中有您需要翻译的折叠块，可以稍后再单独点击这些折叠块内的翻译按钮进行翻译
            </p>
          </div>
          <p>要跳过折叠块吗？（建议选择跳过）</p>
          <div class="buttons">
            <button id="cancelButton">否</button><button id="skipButton">跳过</button>
          </div>
      </div>
      `;
        $('body').before(htmlString);
        $("#skipButton").click(function() {
            $(styleElement).remove();
            $('.CFBetter_modal').remove();
            resolve(true);
        });
        $("#cancelButton").click(function() {
            $(styleElement).remove();
            $('.CFBetter_modal').remove();
            resolve(false);
        });
    });
}

// latex替换
function replaceBlock(text, matches, replacements) {
    try {
        for (let i = 0; i < matches.length; i++) {
            let match = matches[i];
            let replacement = '';
            if (replaceSymbol === "1") {
                replacement = `【${i + 1}】`;
            } else if (replaceSymbol === "2") {
                replacement = `{${i + 1}}`;
            } else if (replaceSymbol === "3") {
                replacement = `[${i + 1}]`;
            }
            text = text.replace(match, replacement);
            replacements[replacement] = match;
        }
    } catch (e) { }
    return text;
}

// latex还原
function recoverBlock(translatedText, matches, replacements) {
    for (let i = 0; i < matches.length; i++) {
        let match = matches[i];
        let replacement = replacements[`【${i + 1}】`] || replacements[`[${i + 1}]`] || replacements[`{${i + 1}}`];

        let latexMatch = '(?<latex_block>\\$\\$(\\\\.|[^\\$])*?\\$\\$)|(?<latex_inline>\\$(\\\\.|[^\\$])*?\\$)|';

        let regex = new RegExp(latexMatch + `【\\s*${i + 1}\\s*】|\\[\\s*${i + 1}\\s*\\]|{\\s*${i + 1}\\s*}`, 'g');
        translatedText = translatedText.replace(regex, function(match, ...args) {
            // LaTeX中的不替换
            const groups = args[args.length - 1]; // groups是replace方法的最后一个参数
            if (groups.latex_block || groups.latex_inline) return match;
            // 没有空格则加一个
            const offset = args[args.length - 3]; // offset是replace方法的倒数第三个参数
            let leftSpace = "", rightSpace = "";
            if (!/\s/.test(translatedText[offset - 1])) leftSpace = " ";
            if (!/\s/.test(translatedText[offset + match.length])) rightSpace = " ";
            return leftSpace + replacement + rightSpace;
        });

        regex = new RegExp(latexMatch + `【\\s*${i + 1}(?![】\\d])|(?<![【\\d])${i + 1}\\s*】|\\[\\s*${i + 1}(?![\\]\\d])|(?<![\\[\\d])${i + 1}\\s*\\]|{\\s*${i + 1}(?![}\\d])|(?<![{\\d])${i + 1}\\s*}`, 'g');
        translatedText = translatedText.replace(regex, function(match, ...args) {
            // LaTeX中的不替换
            const groups = args[args.length - 1];
            if (groups.latex_block || groups.latex_inline) return match;
            // 没有空格则加一个
            const offset = args[args.length - 3];
            let leftSpace = "", rightSpace = "";
            if (!/\s/.test(translatedText[offset - 1])) leftSpace = " ";
            if (!/\s/.test(translatedText[offset + match.length])) rightSpace = " ";
            return leftSpace + replacement + rightSpace;
        });
    }
    return translatedText;
}

// 翻译框/翻译处理器
var translatedText = "";
async function translateProblemStatement(text, element_node, button, is_comment) {
    let status = 0;
    let id = getRandomNumber(8);
    let matches = [];
    let replacements = {};
    let translationService = {
        "deepl": "DeepL",
        "iflyrec": "讯飞听见",
        "youdao": "有道",
        "google": "Google",
        "caiyun": "彩云小译",
        "openai": "ChatGPT"
    };
    // 创建元素并放在element_node的后面
    const translateDiv = $('<div>').attr('id', id).addClass('translate-problem-statement');
    const spanElement = $('<span>');
    translateDiv.append(spanElement);
    $(element_node).after(translateDiv);

    // panel
    var panelDiv = $('<div>').addClass('translate-problem-statement-panel');
    // 信息
    var topText;
    if (is_comment && commentTranslationChoice != "0") topText = $('<div>').text(translationService[commentTranslationChoice] + ' 翻译').addClass('topText');
    else topText = $('<div>').text(translationService[translation] + ' 翻译').addClass('topText');
    panelDiv.append(topText);
    // 右侧
    var rightDiv = $('<div>').css('display', 'flex');
    panelDiv.append(rightDiv);
    var copyButton = $('<div>').html(copyIcon).addClass('borderlessButton');
    rightDiv.append(copyButton);
    var upButton = $('<div>').html(putawayIcon).addClass('borderlessButton');
    rightDiv.append(upButton);
    var closeButton = $('<div>').html(closeIcon).addClass('borderlessButton');
    rightDiv.append(closeButton);

    panelDiv.insertBefore(translateDiv);

    // 收起按钮
    upButton.on("click", function() {
        if (upButton.html() === putawayIcon) {
            upButton.html(unfoldIcon);
            $(translateDiv).css({
                display: "none",
                transition: "height 2s"
            });
        } else {
            // 执行收起操作
            upButton.html(putawayIcon);
            $(translateDiv).css({
                display: "",
                transition: "height 2s"
            });
        }
    });

    // 关闭按钮
    closeButton.on("click", function() {
        $(translateDiv).remove();
        $(panelDiv).remove();
    });

    // 替换latex公式
    if (is_oldLatex) {
        let regex = /<span\s+class="tex-span">.*?<\/span>/gi;
        matches = matches.concat(text.match(regex));
        text = replaceBlock(text, matches, replacements);
        text = text.replace(/<p>(.*?)<\/p>/g, "$1\n\n"); // <p/>标签换为换行
    } else if (is_acmsguru) {
        let regex = /<i>.*?<\/i>|<sub>.*?<\/sub>|<sup>.*?<\/sup>|<pre>.*?<\/pre>/gi;
        matches = matches.concat(text.match(regex));
        text = replaceBlock(text, matches, replacements);
    } else if (translation != "openai") {
        // 使用GPT翻译时不必替换latex公式
        let regex = /\$\$(\\.|[^\$])*?\$\$|\$(\\.|[^\$])*?\$/g;
        matches = matches.concat(text.match(regex));
        text = replaceBlock(text, matches, replacements);
    }
    // 字符数上限
    const translationLimits = {
        deepl: 5000,
        iflyrec: 2000,
        youdao: 600,
        google: 5000,
        caiyun: 5000
    };
    if (translationLimits.hasOwnProperty(translation) && text.length > translationLimits[translation]) {
        const shouldContinue = await showWordsExceededDialog(button, translationLimits[translation], text.length);
        if (!shouldContinue) {
            status = 1;
            return {
                translateDiv: translateDiv,
                status: status
            };
        }
    }
    // 翻译
    async function translate(translation) {
        try {
            if (translation == "deepl") {
                translateDiv.html(`正在使用 ${translationService[translation]} 翻译中……请稍等`);
                translatedText = await translate_deepl(text);
            } else if (translation == "iflyrec") {
                translateDiv.html(`正在使用 ${translationService[translation]} 翻译中……请稍等`);
                translatedText = await translate_iflyrec(text);
            } else if (translation == "youdao") {
                translateDiv.html(`正在使用 ${translationService[translation]} 翻译中……请稍等`);
                translatedText = await translate_youdao_mobile(text);
            } else if (translation == "google") {
                translateDiv.html(`正在使用 ${translationService[translation]} 翻译中……请稍等`);
                translatedText = await translate_gg(text);
            } else if (translation == "caiyun") {
                translateDiv.html(`正在使用 ${translationService[translation]} 翻译中……请稍等`);
                await translate_caiyun_startup();
                translatedText = await translate_caiyun(text);
            } else if (translation == "openai") {
                translateDiv.html("正在使用 ChatGPT 翻译中……" +
                    "<br><br>应用的配置：" + opneaiConfig.configurations[opneaiConfig.choice].note +
                    "<br><br>使用 ChatGPT 翻译需要很长的时间，请耐心等待");
                translatedText = await translate_openai(text);
            }
            if (/^翻译出错/.test(translatedText)) status = 2;
        } catch (error) {
            status = 2;
            translatedText = error;
        }
    }
    if (is_comment && commentTranslationChoice != "0") await translate(commentTranslationChoice);
    else await translate(translation);

    // 还原latex公式
    translatedText = translatedText.replace(/】\s*【/g, '】 【');
    translatedText = translatedText.replace(/\]\s*\[/g, '] [');
    translatedText = translatedText.replace(/\}\s*\{/g, '} {');
    if (is_oldLatex) {
        translatedText = translatedText.replace(/(.+?)(\n\n|$)/g, "<p>$1</p>"); // 还原为<p/>标签
        translatedText = recoverBlock(translatedText, matches, replacements);
    } else if (is_acmsguru) {
        translatedText = recoverBlock(translatedText, matches, replacements);
    } else if (translation != "openai") {
        translatedText = recoverBlock(translatedText, matches, replacements);
    }

    // 结果复制按钮
    if (!is_oldLatex && !is_acmsguru) {
        // 创建一个隐藏的元素来保存 translatedText 的值
        var textElement = document.createElement("div");
        textElement.style.display = "none";
        textElement.textContent = translatedText;
        translateDiv.parent().insertBefore(textElement, translateDiv);

        // 复制按钮
        copyButton.on("click", function() {
            var translatedText = textElement.textContent;
            GM_setClipboard(translatedText);
            copyButton.html(copyedIcon);
            copyButton.css({ 'fill': '#8bc34a' });
            // 复制提示
            setTimeout(() => {
                copyButton.html(copyIcon);
                copyButton.css({ 'fill': '' });
            }, 2000);
        });
    }

    // 转义LaTex中的特殊符号
    if (!is_oldLatex && !is_acmsguru) {
        const escapeRules = [
            { pattern: /(?<!\\)>(?!\s)/g, replacement: " &gt; " }, // >符号
            { pattern: /(?<!\\)</g, replacement: " &lt; " }, // <符号
            { pattern: /(?<!\\)\*/g, replacement: " &#42; " }, // *符号
            { pattern: /(?<!\\)_/g, replacement: " &#95; " }, // _符号
            { pattern: /(?<!\\)\\\\(?=\s)/g, replacement: "\\\\\\\\" }, // \\符号
            { pattern: /(?<!\\)\\(?![\\a-zA-Z0-9])/g, replacement: "\\\\" }, // \符号
        ];

        let latexMatches = [...translatedText.matchAll(/\$\$([\s\S]*?)\$\$|\$(.*?)\$|\$([\s\S]*?)\$/g)];

        for (const match of latexMatches) {
            const matchedText = match[0];
            var escapedText = matchedText;

            for (const rule of escapeRules) {
                escapedText = escapedText.replaceAll(rule.pattern, rule.replacement);
            }
            escapedText = escapedText.replace(/\$\$/g, "$$$$$$$$");// $$符号（因为后面需要作为replacement）
            translatedText = translatedText.replace(matchedText, escapedText);
        }
    }

    // 使符合mathjx的转换语法
    const mathjaxRuleMap = [
        { pattern: /\$/g, replacement: "$$$$$$" }, // $$ 行间
    ];
    mathjaxRuleMap.forEach(({ pattern, replacement }) => {
        translatedText = translatedText.replace(pattern, replacement);
    });

    // markdown修正
    const mdRuleMap = [
        { pattern: /(\s_[\u4e00-\u9fa5]+_)([\u4e00-\u9fa5]+)/g, replacement: "$1 $2" }, // 斜体
        { pattern: /(_[\u4e00-\u9fa5]+_\s)([\u4e00-\u9fa5]+)/g, replacement: " $1$2" },
        { pattern: /(_[\u4e00-\u9fa5]+_)([\u4e00-\u9fa5]+)/g, replacement: " $1 $2" },
        { pattern: /（([\s\S]*?)）/g, replacement: "($1)" }, // 中文（）
        // { pattern: /：/g, replacement: ":" }, // 中文：
        { pattern: /\*\* (.*?) \*\*/g, replacement: "\*\*$1\*\*" } // 加粗
    ];
    mdRuleMap.forEach(({ pattern, replacement }) => {
        translatedText = translatedText.replace(pattern, replacement);
    });

    // 更新
    if (is_oldLatex || is_acmsguru) {
        // oldlatex
        translatedText = $.parseHTML(translatedText);
        translateDiv.empty().append($(translatedText));
        return {
            translateDiv: translateDiv,
            status: status,
            copyDiv: textElement,
            panelDiv: panelDiv,
            upButton: upButton
        };
    } else {
        // 渲染MarkDown
        var md = window.markdownit();
        var html = md.render(translatedText);
        translateDiv.html(html);
        // 渲染Latex
        MathJax.Hub.Queue(["Typeset", MathJax.Hub, translateDiv.get(0)]);

        return {
            translateDiv: translateDiv,
            status: status,
            copyDiv: textElement,
            panelDiv: panelDiv,
            upButton: upButton
        };
    }

}

// ChatGPT
async function translate_openai(raw) {
    var openai_retext = "";
    var data;
    if (is_oldLatex || is_acmsguru) {
        data = {
            model: (openai_model !== null && openai_model !== "") ? openai_model : 'gpt-3.5-turbo',
            messages: [{
                role: "user",
                content: "请将下面的文本翻译为中文，这是一道编程竞赛题描述的一部分，注意术语的翻译，注意保持其中的【】、HTML标签本身以及其中的内容不翻译不变动，你只需要回复翻译后的内容即可，不要回复任何其他内容：\n\n" + raw
            }],
            temperature: 0.7,
            ...Object.assign({}, ...openai_data)
        };
    } else {
        data = {
            model: (openai_model !== null && openai_model !== "") ? openai_model : 'gpt-3.5-turbo',
            messages: [{
                role: "user",
                content: "请将下面的文本翻译为中文，这是一道编程竞赛题描述的一部分，注意术语的翻译，注意保持其中的latex公式不翻译，你只需要回复翻译后的内容即可，不要回复任何其他内容：\n\n" + raw
            }],
            temperature: 0.7
        };
    };
    return new Promise(function(resolve, reject) {
        GM_xmlhttpRequest({
            method: 'POST',
            url: (openai_proxy !== null && openai_proxy !== "") ? openai_proxy : 'https://api.openai.com/v1/chat/completions',

            data: JSON.stringify(data),
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + openai_key,
                ...Object.assign({}, ...openai_header)
            },
            responseType: 'json',
            onload: function(response) {
                if (!response.response) {
                    reject("发生了未知的错误，如果你启用了代理API，请确认是否填写正确，并确保代理能够正常工作。\n\n如果无法解决，请前往 https://greasyfork.org/zh-CN/scripts/465777/feedback 寻求帮助 请注意打码响应报文的敏感部分\n\n响应报文：" + JSON.stringify(response));
                }
                else if (!response.response.choices || response.response.choices.length < 1 || !response.response.choices[0].message) {
                    resolve("翻译出错，请重试\n\n如果无法解决，请前往 https://greasyfork.org/zh-CN/scripts/465777/feedback 寻求帮助 \n\n报错信息：" + JSON.stringify(response.response, null, '\n'));
                } else {
                    openai_retext = response.response.choices[0].message.content;
                    resolve(openai_retext);
                }
            },
            onerror: function(response) {
                reject("发生了未知的错误，请确认你是否能正常访问OpenAi的接口，如果使用代理API，请检查是否正常工作\n\n如果无法解决，请前往 https://greasyfork.org/zh-CN/scripts/465777/feedback 寻求帮助 请注意打码响应报文的敏感部分\n\n响应报文：" + JSON.stringify(response));
            },
        });
    });
}

//--谷歌翻译--start
async function translate_gg(raw) {
    return new Promise((resolve, reject) => {
        const url = 'https://translate.google.com/m';
        const params = `tl=zh-CN&q=${encodeURIComponent(raw)}`;

        GM_xmlhttpRequest({
            method: 'GET',
            url: `${url}?${params}`,
            onload: function(response) {
                const html = response.responseText;
                const translatedText = $(html).find('.result-container').text();
                resolve(translatedText);
            },
            onerror: function(response) {
                reject("发生了未知的错误，请确认你是否能正常访问Google翻译，\n\n如果无法解决，请前往 https://greasyfork.org/zh-CN/scripts/465777/feedback 寻求帮助 请注意打码报错信息的敏感部分\n\n响应报文：" + JSON.stringify(response))
            }
        });
    });
}
//--谷歌翻译--end

//--有道翻译m--start
async function translate_youdao_mobile(raw) {
    const options = {
        method: "POST",
        url: 'http://m.youdao.com/translate',
        data: "inputtext=" + encodeURIComponent(raw) + "&type=AUTO",
        anonymous: true,
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            'Host': 'm.youdao.com',
            'Origin': 'http://m.youdao.com',
            'Referer': 'http://m.youdao.com/translate',
        }
    }
    return await BaseTranslate('有道翻译mobile', raw, options, res => /id="translateResult">\s*?<li>([\s\S]*?)<\/li>\s*?<\/ul/.exec(res)[1])
}
//--有道翻译m--end

//--彩云翻译--start
async function translate_caiyun_startup() {
    const browser_id = CryptoJS.MD5(Math.random().toString()).toString();
    sessionStorage.setItem('caiyun_id', browser_id);
    const options = {
        method: "POST",
        url: 'https://api.interpreter.caiyunai.com/v1/user/jwt/generate',
        headers: {
            "Content-Type": "application/json",
            "X-Authorization": "token:qgemv4jr1y38jyq6vhvi",
            "Origin": "https://fanyi.caiyunapp.com",
        },
        data: JSON.stringify({ browser_id }),
    }
    const res = await Request(options);
    sessionStorage.setItem('caiyun_jwt', JSON.parse(res.responseText).jwt);
}

async function translate_caiyun(raw) {
    const source = "NOPQRSTUVWXYZABCDEFGHIJKLMnopqrstuvwxyzabcdefghijklm";
    const dic = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"].reduce((dic, current, index) => { dic[current] = source[index]; return dic }, {});
    // 解码
    const decodeUnicode = str => {
        const decoder = new TextDecoder();
        const data = Uint8Array.from(atob(str), c => c.charCodeAt(0));
        return decoder.decode(data);
    };
    const decoder = line => decodeUnicode([...line].map(i => dic[i] || i).join(""));
    const options = {
        method: "POST",
        url: 'https://api.interpreter.caiyunai.com/v1/translator',
        data: JSON.stringify({
            "source": raw.split('\n'),
            "trans_type": "auto2zh",
            "detect": true,
            "browser_id": sessionStorage.getItem('caiyun_id')
        }),
        headers: {
            "X-Authorization": "token:qgemv4jr1y38jyq6vhvi",
            "T-Authorization": sessionStorage.getItem('caiyun_jwt')
        }
    }
    return await BaseTranslate('彩云小译', raw, options, res => JSON.parse(res).target.map(decoder).join('\n'))
}
//--彩云翻译--end

//--Deepl翻译--start
function getTimeStamp(iCount) {
    const ts = Date.now();
    if (iCount !== 0) {
        iCount = iCount + 1;
        return ts - (ts % iCount) + iCount;
    } else {
        return ts;
    }
}

async function translate_deepl(raw) {
    const id = (Math.floor(Math.random() * 99999) + 100000) * 1000;
    const data = {
        jsonrpc: '2.0',
        method: 'LMT_handle_texts',
        id,
        params: {
            splitting: 'newlines',
            lang: {
                source_lang_user_selected: 'auto',
                target_lang: 'ZH',
            },
            texts: [{
                text: raw,
                requestAlternatives: 3
            }],
            timestamp: getTimeStamp(raw.split('i').length - 1)
        }
    }
    let postData = JSON.stringify(data);
    if ((id + 5) % 29 === 0 || (id + 3) % 13 === 0) {
        postData = postData.replace('"method":"', '"method" : "');
    } else {
        postData = postData.replace('"method":"', '"method": "');
    }
    const options = {
        method: 'POST',
        url: 'https://www2.deepl.com/jsonrpc',
        data: postData,
        headers: {
            'Content-Type': 'application/json',
            'Host': 'www2.deepl.com',
            'Origin': 'https://www.deepl.com',
            'Referer': 'https://www.deepl.com/',
        },
        anonymous: true,
        nocache: true,
    }
    return await BaseTranslate('Deepl翻译', raw, options, res => JSON.parse(res).result.texts[0].text)
}

//--Deepl翻译--end

//--讯飞听见翻译--end
async function translate_iflyrec(text) {
    const options = {
        method: "POST",
        url: 'https://www.iflyrec.com/TranslationService/v1/textTranslation',
        data: JSON.stringify({
            "from": "2",
            "to": "1",
            "contents": [{
                "text": text,
                "frontBlankLine": 0
            }]
        }),
        anonymous: true,
        headers: {
            'Content-Type': 'application/json',
            'Origin': 'https://www.iflyrec.com',
        },
        responseType: "json",
    };
    return await BaseTranslate('讯飞翻译', text, options, res => JSON.parse(res).biz[0].translateResult.replace(/\\n/g, "\n\n"));
}
//--讯飞听见翻译--end

//--异步请求包装工具--start
async function PromiseRetryWrap(task, options, ...values) {
    const { RetryTimes, ErrProcesser } = options || {};
    let retryTimes = RetryTimes || 5;
    const usedErrProcesser = ErrProcesser || (err => { throw err });
    if (!task) return;
    while (true) {
        try {
            return await task(...values);
        } catch (err) {
            if (!--retryTimes) {
                console.warn(err);
                return usedErrProcesser(err);
            }
        }
    }
}

async function BaseTranslate(name, raw, options, processer) {
    let errtext;
    const toDo = async () => {
        var tmp;
        try {
            const data = await Request(options);
            tmp = data.responseText;
            let result = await processer(tmp);
            return result;
        } catch (err) {
            errtext = tmp;
            throw {
                responseText: tmp,
                err: err
            }
        }
    }
    return await PromiseRetryWrap(toDo, { RetryTimes: 3, ErrProcesser: () => "翻译出错，请查看报错信息，并重试或更换翻译接口\n\n如果无法解决，请前往 https://greasyfork.org/zh-CN/scripts/465777/feedback 寻求帮助 请注意打码报错信息的敏感部分\n\n报错信息：" + errtext })
}

function Request(options) {
    return new Promise((reslove, reject) => GM_xmlhttpRequest({ ...options, onload: reslove, onerror: reject }))
}

//--异步请求包装工具--end

// 开始
document.addEventListener("DOMContentLoaded", function() {
    function checkJQuery(retryDelay) {
        if (typeof jQuery === 'undefined') {
            console.warn("JQuery未加载，" + retryDelay + "毫秒后重试");
            setTimeout(function() {
                var newRetryDelay = Math.min(retryDelay * 2, 2000);
                checkJQuery(newRetryDelay);
            }, retryDelay);
        } else {
            executeFunctions();
        }
    }
    checkJQuery(50);
    function executeFunctions() {
        init();
        ShowAlertMessage();
        settingPanel();
        checkScriptVersion();
        toZH_CN();
        var newElement = $("<div></div>").addClass("alert alert-info CFBetter_alert")
            .html(`Codeforces Better! —— 正在等待页面资源加载……`)
            .css({
                "margin": "1em",
                "text-align": "center",
                "font-weight": "600",
                "position": "relative"
            });

        async function processPage() {
            if (showLoading) newElement.html('Codeforces Better! —— 正在等待LaTeX渲染队列全部完成……');
            await waitUntilIdleThenDo(async function() {
                if (showJumpToLuogu && is_problem) CF2luogu();

                Promise.resolve()
                    .then(async () => {
                        if (showLoading && is_problem) newElement.html('Codeforces Better! —— 正在连接数据库……');
                        await delay(100);
                        if (is_problem && problemPageCodeEditor) await initDB();
                    })
                    .then(() => {
                        if (showLoading && expandFoldingblocks) newElement.html('Codeforces Better! —— 正在展开折叠块……');
                        return delay(100).then(() => { if (expandFoldingblocks) ExpandFoldingblocks() });
                    })
                    .then(() => {
                        if (showLoading && commentPaging) newElement.html('Codeforces Better! —— 正在对评论区分页……');
                        return delay(100).then(() => { if (commentPaging) CommentPagination() });
                    })
                    .then(() => {
                        if (showLoading && is_acmsguru) newElement.html('Codeforces Better! —— 正在为acmsguru题面重新划分div……');
                        return delay(100).then(() => { if (is_acmsguru) acmsguruReblock() });
                    })
                    .then(() => {
                        if (showLoading) newElement.html('Codeforces Better! —— 正在加载按钮……');
                        return delay(100).then(() => addConversionButton());
                    })
                    .then(() => {
                        if (showLoading && commentTranslationMode == "2") newElement.html('Codeforces Better! —— 正在加载选段翻译……');
                        return delay(100).then(() => { if (commentTranslationMode == "2") multiChoiceTranslation() });
                    })
                    .then(async () => {
                        if (showLoading && renderPerfOpt) newElement.html('Codeforces Better! —— 正在优化折叠块渲染……');
                        await delay(100);
                        if (renderPerfOpt) await RenderPerfOpt();
                    })
                    .then(async () => {
                        if (showLoading && standingsRecolor && is_cfStandings) newElement.html('Codeforces Better! —— 正在为榜单重新着色……');
                        await delay(100);
                        if (standingsRecolor && is_cfStandings) await recolorStandings();
                    })
                    .then(async () => {
                        if (showLoading && is_problem) newElement.html('Codeforces Better! —— 正在添加代码编辑器……');
                        await delay(100);
                        if (is_problem && problemPageCodeEditor) await addProblemPageCodeEditor();
                    })
                    .then(async () => {
                        await delay(100);
                        if (showLoading && showClistRating_contest && is_contest) {
                            newElement.html('Codeforces Better! —— 正在加载Clist数据……');
                            await showRatingByClist_contest();
                        }
                        if (showLoading && showClistRating_problemset && is_problemset) {
                            newElement.html('Codeforces Better! —— 正在加载Clist数据……');
                            await showRatingByClist_problemset();
                        }
                        if (showLoading && showClistRating_problem && is_problem) {
                            newElement.html('Codeforces Better! —— 正在加载Clist数据……');
                            await showRatingByClist_problem();
                        }
                    })
                    .then(() => {
                        alertZh();
                        if (showLoading) {
                            newElement.html('Codeforces Better! —— 加载已完成');
                            newElement.removeClass('alert-info').addClass('alert-success');
                            setTimeout(function() {
                                newElement.remove();
                            }, 3000);
                        }
                    })
                    .catch((error) => {
                        console.warn(error);
                    });
            });
        }

        function delay(ms) {
            return new Promise((resolve) => setTimeout(resolve, ms));
        }

        if (showLoading) {
            if (is_mSite) $("header").after(newElement);
            else $(".menu-box:first").next().after(newElement);
        }

        if (loaded) {
            processPage();
        } else {
            // 页面完全加载完成后执行
            window.onload = function() {
                processPage();
            };
        }
    }
});

// 配置自动迁移代码（将在10个小版本后移除-1.66）
if (GM_getValue("openai_key") || GM_getValue("api2d_key")) {
    const newConfig = { "choice": -1, "configurations": [] };
    if (GM_getValue("openai_key")) {
        let config1 = {
            "note": "我的配置1",
            "model": GM_getValue("openai_model") || "",
            "key": GM_getValue("openai_key"),
            "proxy": GM_getValue("openai_proxy") || "",
            "_header": "",
            "_data": ""
        }
        if (GM_getValue("translation") === "openai") newConfig.choice = 0;
        newConfig.configurations.push(config1);
    }
    if (GM_getValue("api2d_key")) {
        let config2 = {
            "note": "api2d",
            "model": GM_getValue("api2d_model"),
            "key": GM_getValue("api2d_key"),
            "proxy": GM_getValue("api2d_request_entry") + '/v1/chat/completions',
            "_header": GM_getValue("x_api2d_no_cache") ? "" : " x-api2d-no-cache : 1",
            "_data": ""
        }
        if (GM_getValue("translation") === "api2d") {
            if (GM_getValue("openai_key")) newConfig.choice = 1;
            else newConfig.choice = 0;
        }
        newConfig.configurations.push(config2);
    }
    GM_setValue("chatgpt-config", newConfig);
    const keysToDelete = ["openai_key", "openai_model", "openai_proxy", "api2d_key", "api2d_model", "api2d_request_entry", "x_api2d_no_cache", "showOpneAiAdvanced"];
    keysToDelete.forEach(key => {
        if (GM_getValue(key) != undefined) GM_deleteValue(key);
    });
    if (GM_getValue("translation") === "api2d") GM_setValue("translation", "openai");
    location.reload();
}
// 配置自动迁移代码（将在10个小版本后移除-1.71）
if (GM_getValue("darkMode") === true || GM_getValue("darkMode") === false) {
    GM_setValue("darkMode", "follow");
    location.reload();
}
