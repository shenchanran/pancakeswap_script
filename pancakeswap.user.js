// ==UserScript==
// @name         pancakeswapV3交易对盈利计算器
// @namespace    pancakeswapV3
// @version      0.0.2
// @description  根据实时信息计算你当前的盈利
// @author       shenchanran
// @match        https://pancakeswap.finance/liquidity/*
// @grant        unsafeWindow
// @grant        GM_setValue
// @grant        GM_getValue
// @license      MIT
// ==/UserScript==

(function () {
    'use strict';

    // 创建容器
    const panel = document.createElement('div'),
        $s = Object.fromEntries(new URLSearchParams(unsafeWindow.location.search));
    panel.id = 'tm-draggable-panel';

    // 基础样式
    Object.assign(panel.style, {
        position: 'fixed',
        width: '320px',               // 改成固定像素更易读，也避免30%在超宽屏下太夸张
        maxHeight: '60vh',            // 防止太高溢出
        right: '20px',
        top: '80px',
        background: 'rgba(0,0,0,0.7)',
        color: '#fff',
        fontSize: '13px',
        lineHeight: '1.4',
        padding: '8px',
        borderRadius: '8px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
        border: '1px solid rgba(255,255,255,0.2)',
        zIndex: '999999999',
        cursor: 'move',
        userSelect: 'none',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        overflow: 'hidden'
    });

    // 内部结构
    panel.innerHTML = `
        <!-- 顶部标题栏 -->
        <div style="
            font-size:12px;
            font-weight:bold;
            color:#fff;
            display:flex;
            align-items:center;
            justify-content:space-between;
            margin-bottom:6px;
        ">
            <span>V3 盈利计算器</span>
            <span style="font-size:10px;color:#888;">beta</span>
        </div>

        <!-- 输入区 -->
        <div style="
            background:rgba(255,255,255,0.07);
            border:1px solid rgba(255,255,255,0.15);
            border-radius:6px;
            padding:6px;
            margin-bottom:8px;
            display:flex;
            flex-direction:column;
            gap:6px;
        ">
            <label style="font-size:12px;color:#bbb;display:block;">
                投入金额 (USD)
            </label>
            <div style="display:flex;align-items:center;gap:6px;">
                <input id="initialUsdInput" type="number" min="0" step="0.01" placeholder="按照U为单位" style="
                    flex:1;
                    background:rgba(0,0,0,0.4);
                    border:1px solid rgba(255,255,255,0.25);
                    border-radius:4px;
                    color:#fff;
                    font-size:12px;
                    line-height:1.4;
                    padding:6px 8px;
                    outline:none;
                    box-sizing:border-box;
                ">
                <button id="applyInitialUsdBtn" style="
                    flex-shrink:0;
                    background:linear-gradient(135deg,#3b82f6 0%,#1e40af 100%);
                    border:1px solid rgba(255,255,255,0.3);
                    border-radius:4px;
                    padding:6px 10px;
                    font-size:12px;
                    font-weight:bold;
                    color:#fff;
                    cursor:pointer;
                    line-height:1.2;
                ">
                    确定
                </button>
            </div>
        </div>

        <!-- 信息展示区 -->
        <div style="
            flex:1;
            min-height:0;
            overflow:auto;
            background:rgba(255,255,255,0.03);
            border:1px solid rgba(255,255,255,0.12);
            border-radius:6px;
            padding:6px;
            box-sizing:border-box;
            display:flex;
            flex-direction:column;
            gap:6px;
        ">

            <!-- 采用“名称 / 值” 的双列网格 -->
            <div id="datas" style="display:grid;grid-template-columns:110px 1fr;row-gap:4px;column-gap:8px;font-size:12px;line-height:1.4;color:#eee;">

                <div style="color:#aaa;">是否在区间内</div>
                <div id="isIN" style="font-weight:600;">--</div>

                <div style="color:#aaa;">投入金额</div>
                <div id="initialUsdValue" style="font-weight:600;">--</div>

                <div style="color:#aaa;">当前代币价格</div>
                <div id="currentPriceValue" style="font-weight:600;">--</div>

                <div style="color:#aaa;">入场代币价格</div>
                <div id="entryPriceValue" style="font-weight:600;">--</div>

                <div style="color:#aaa;">已获手续费</div>
                <div id="feeEarnedValue" style="font-weight:600;color:#4ade80;">--</div>

                <div style="color:#aaa;">当前代币持仓</div>
                <div id="tokenAmountValue" style="font-weight:600;">--</div>

                <div style="color:#aaa;">当前稳定币持仓</div>
                <div id="stableAmountValue" style="font-weight:600;">--</div>

                <div style="color:#aaa;">价格区间</div>
                <div id="rangeValue" style="font-weight:600;">--</div>

                <div style="color:#aaa;">当前仓位价值</div>
                <div id="positionNowValue" style="font-weight:600;">--</div>

                <div style="color:#aaa;">当前盈利</div>
                <div id="profitValue" style="font-weight:600;color:#4ade80;">--</div>

                <div style="color:#aaa;">当前利率</div>
                <div id="apyValue" style="font-weight:600;color:#4ade80;">--</div>
                
                <div style="color:#aaa;">当前位置</div>
                <div id="nowPos" style="font-weight:600;color:#4ade80;">--</div>

                <div style="color:#aaa;">区间范围(单向)</div>
                <div id="qujian" style="font-weight:600;color:#4ade80;">--</div>

                <!--<div style="color:#aaa;">区间上限</div>
                <div id="rangeHighValue" style="font-weight:600;">--</div>

                <div style="color:#aaa;">区间下限</div>
                <div id="rangeLowValue" style="font-weight:600;">--</div>-->
            </div>

            <!-- 分隔线 -->
            <div style="
                margin:6px 0;
                border-top:1px solid rgba(255,255,255,0.1);
            "></div>

            <!-- 建议区单独拉满宽度 -->
            <div style="font-size:12px;line-height:1.5;color:#fff;">
                <div style="color:#aaa;margin-bottom:2px;">持仓建议</div>
                <div id="adviceValue" style="
                    font-weight:600;
                    color:#fde68a;
                ">
                    价格接近区间上限，建议逐步撤出一部分流动性锁定收益
                </div>
            </div>
        </div>

        <!-- 底部小脚注 -->
        <div style="
            text-align:right;
            font-size:10px;
            color:#666;
            margin-top:6px;
        ">
            实时监控中…
        </div>
    `;

    document.body.appendChild(panel);

    // 拖拽逻辑
    (function makeDraggable(el) {
        let isDown = false;
        let startX = 0;
        let startY = 0;
        let startLeft = 0;
        let startTop = 0;

        function ensureUsingLeftTop() {
            const rect = el.getBoundingClientRect();
            el.style.left = rect.left + 'px';
            el.style.top = rect.top + 'px';
            el.style.right = 'auto';
            el.style.bottom = 'auto';
            el.style.cursor = 'move';
        }

        el.addEventListener('mousedown', (e) => {
            // 如果用户在输入框/按钮上按下，就不要触发拖拽
            const tag = e.target.tagName.toLowerCase();
            if (tag === 'input' || tag === 'button' || tag === 'textarea' || e.target.isContentEditable) {
                return;
            }

            isDown = true;
            ensureUsingLeftTop();

            startX = e.clientX;
            startY = e.clientY;
            startLeft = parseFloat(el.style.left);
            startTop = parseFloat(el.style.top);

            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDown) return;

            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            let newLeft = startLeft + dx;
            let newTop = startTop + dy;

            const maxLeft = window.innerWidth - el.offsetWidth;
            const maxTop = window.innerHeight - el.offsetHeight;

            if (newLeft < 0) newLeft = 0;
            if (newTop < 0) newTop = 0;
            if (newLeft > maxLeft) newLeft = maxLeft;
            if (newTop > maxTop) newTop = maxTop;

            el.style.left = newLeft + 'px';
            el.style.top = newTop + 'px';
        });

        document.addEventListener('mouseup', () => {
            isDown = false;
        });
    })(panel);
    panel.querySelector('#applyInitialUsdBtn').addEventListener('click', function () {
        const tokenId = $s['tokenId']||unsafeWindow.location.href.match(/liquidity\/(\d+)\?/)[1];
        if (!tokenId) {
            return;
        }
        let initialUsdValue = panel.querySelector('#initialUsdInput').value;
        if (initialUsdValue <= 0) {
            return;
        }
        GM_setValue(tokenId, initialUsdValue);
        render();
    })
    const nodeMap = {
        区间内: { s: '.sc-3fcdcbc5-1.sc-9cde33ed-0.gbBSci.bhTcKs>.sc-989df720-0.kWBErU', i: 0 },
        当前代币持仓: { s: '.sc-3fcdcbc5-1.sc-9cde33ed-0.gbBSci.gFUdWE>.sc-1e14ff52-0.jZKhjC', i: 0 },
        当前稳定币持仓: { s: '.sc-3fcdcbc5-1.sc-9cde33ed-0.gbBSci.gFUdWE>.sc-1e14ff52-0.jZKhjC', i: 1 },
        当前代币奖励: { s: '.sc-3fcdcbc5-1.sc-9cde33ed-0.gbBSci.gFUdWE>.sc-1e14ff52-0.eGVPaE', i: 0 },
        当前稳定币奖励: { s: '.sc-3fcdcbc5-1.sc-9cde33ed-0.gbBSci.gFUdWE>.sc-1e14ff52-0.eGVPaE', i: 1 },
        最低代币价格: { s: '.sc-3fcdcbc5-1.sc-3fb999a5-0.sc-3fb999a5-2.lpuOsy.eUNTUw.diFng>.sc-1e14ff52-0.sc-d3773c3c-0.eFuWTw.dCGsLH', i: 0 },
        最高代币价格: { s: '.sc-3fcdcbc5-1.sc-3fb999a5-0.sc-3fb999a5-2.hKMEfs.eUNTUw.diFng>.sc-1e14ff52-0.sc-d3773c3c-0.eFuWTw.dCGsLH', i: 0 },
        当前代币价格: { s: '.sc-3fcdcbc5-1.sc-3fb999a5-0.sc-3fb999a5-2.gbBSci.eUNTUw.diFng>.dCGsLH', i: 0 },
        汇率分母: { s: '.sc-fd486af3-0.fjJGMT.sc-bb7aac7a-0.jJcYUn', i: 0 }
    }
    function $(node) {
        let nodeE = document.querySelectorAll(node)
        if (!nodeE) {
            return false
        }
        return nodeE
    }
    const green = '#4ade80'
    const red = '#F54927'
    const orange = 'orange'
    function showInfo(info, color = '#4ade80') {
        const el = document.querySelector('#adviceValue')
        el.innerText = info;
        el.style.color = color;
    }
    function setValue(name, value, color = false) {
        const item = panel.querySelector('#' + name)
        item.innerText = value
        item.style.color = color ? color : 'white'
    }

    function render() {
        const tokenId = $s['tokenId']||unsafeWindow.location.href.match(/liquidity\/(\d+)\?/)[1]
        let initialUsdValue = GM_getValue(tokenId, 0)//初始投资金额
        if (initialUsdValue == 0) {
            showInfo('请先设置初始资金', red)
            return;
        }
        showInfo('正在获取数据，如果时间过久，请检查页面是否完全加载或者脚本是否出错', orange)
        const datas = {}
        try {
            for (const e in nodeMap) {
                const el = $(nodeMap[e].s)[nodeMap[e].i].innerHTML
                if (!el || el == '') {
                    throw "获取" + e + "失败";
                }
                datas[e] = el
            }
            datas['入场代币价格'] = (datas.最高代币价格 * 1 + datas.最低代币价格 * 1) / 2
            datas['反向代币实时价格'] = 1 / datas.当前代币价格 //一个代币=多少稳定币
            datas['当前代币奖励换算为U'] = datas.当前代币奖励 * datas['反向代币实时价格']
            datas['当前手续费总计奖励'] = datas.当前代币奖励换算为U * 1 + datas.当前稳定币奖励 * 1
            datas['当前仓位价值'] = datas.当前代币持仓 * datas['反向代币实时价格'] + datas.当前稳定币持仓 * 1
            datas['当前盈利'] = datas.当前仓位价值 - initialUsdValue + datas['当前手续费总计奖励']
            datas['当前利率'] = datas.当前盈利 / datas.当前仓位价值 * 100
            datas['代币价格变化率'] = (datas.入场代币价格-datas.当前代币价格)/datas.入场代币价格*100
            datas['区间范围'] = (datas.最高代币价格-datas.最低代币价格)/datas.入场代币价格*50
        } catch (e) {
            console.log(e)
            showInfo('获取数据失败，请检查页面是否完全加载(是否缺数据、是否崩盘)', red)
            return
        }
        if (!datas.汇率分母.includes('USDT') && !datas.汇率分母.includes('USDC')) {
            showInfo('汇率分母仅支持USDT和USDC，请调整', red)
            return
        }
        setValue('initialUsdValue', '$' + initialUsdValue)
        setValue('currentPriceValue', datas.当前代币价格)
        setValue('entryPriceValue', datas.入场代币价格)
        setValue('feeEarnedValue', '$'+datas.当前手续费总计奖励)
        setValue('tokenAmountValue', datas.当前代币持仓)
        setValue('stableAmountValue', '$' + datas.当前稳定币持仓)
        setValue('rangeValue', datas.最高代币价格 + '~' + datas.最低代币价格)
        setValue('positionNowValue', '$' + datas['当前仓位价值'])
        setValue('profitValue', '$' + datas.当前盈利, datas.当前盈利 > 0 ? green : red)
        setValue('apyValue', (datas.当前利率 > 0 ? '+' : '-') + datas.当前利率.toFixed(3) + '%', datas.当前利率 > 0 ? green : red)
        setValue('nowPos',(datas.代币价格变化率>0?'+':'')+datas.代币价格变化率.toFixed(3)+'%   '+(datas.代币价格变化率<0?'负区间（手续费垫付亏损）':'正区间（纯盈利）'),datas.代币价格变化率<0?red:green)
        setValue('qujian',datas.区间范围.toFixed(2)+'%')
        // setValue('rangeHighValue', datas.最低代币价格)
        // setValue('rangeLowValue', datas.最高代币价格)
        
        setValue('isIN','是',green)
        if (!datas.区间内.includes('区间内')) {
            setValue('isIN','否',red)
            if (datas.当前代币价格 < datas.最低代币价格) {
                showInfo('你的池子已经赚够了钱，请撤出，继续持有也不会再有奖励', green)
            } else if (datas.当前代币价格 > datas.最高代币价格) {
                showInfo('代币价值下跌，你的池子全是廉价代币，请评估币价是否会回升或立即撤出止损', red)
            }
        } else if (datas.当前盈利 <= 0) {
            showInfo('你已经出现了事实亏损，请考虑撤出', orange)
            return
        } else if (datas.当前盈利 > 0) {
            showInfo('你正在盈利，无须担心', green)
            return
        }
    }
    setInterval(render, 500)
})();
