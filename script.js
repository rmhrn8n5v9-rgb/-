import { initializeApp } from
"https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";

import {
    getDatabase,
    ref,
    set,
    onValue,
    remove,
    update
} from
"https://www.gstatic.com/firebasejs/12.2.1/firebase-database.js";


// =====================================
// Firebase
// =====================================

const firebaseConfig = {
    apiKey: "AIzaSyBSUuyyxr5Duvm_sp0x7lSCNC-o9lGrUpg",
    authDomain: "seat-1a2e8.firebaseapp.com",
    databaseURL: "https://seat-1a2e8-default-rtdb.firebaseio.com",
    projectId: "seat-1a2e8",
    storageBucket: "seat-1a2e8.firebasestorage.app",
    messagingSenderId: "571458713265",
    appId: "1:571458713265:web:7193eccb5b1710b8b3d490",
    measurementId: "G-3LL31LK2RW"
};


const app =
    initializeApp(firebaseConfig);


const database =
    getDatabase(app);


// =====================================
// HTML
// =====================================

const seatsArea =
    document.getElementById("seats");


const seatModeButton =
    document.getElementById(
        "seatModeButton"
    );


const seatModeMessage =
    document.getElementById(
        "seatModeMessage"
    );


const bulkActionBar =
    document.getElementById(
        "bulkActionBar"
    );


const bulkActionText =
    document.getElementById(
        "bulkActionText"
    );


const bulkConfirmButton =
    document.getElementById(
        "bulkConfirmButton"
    );


const bulkCancelButton =
    document.getElementById(
        "bulkCancelButton"
    );


const resetOpenButton =
    document.getElementById(
        "resetOpenButton"
    );


const resetConfirmArea =
    document.getElementById(
        "resetConfirmArea"
    );


const resetExecuteButton =
    document.getElementById(
        "resetExecuteButton"
    );


const resetCancelButton =
    document.getElementById(
        "resetCancelButton"
    );


const seatMoveButton =
    document.getElementById(
        "seatMoveButton"
    );


const seatMoveMessage =
    document.getElementById(
        "seatMoveMessage"
    );


const seatMoveBar =
    document.getElementById(
        "seatMoveBar"
    );


const seatMoveStatus =
    document.getElementById(
        "seatMoveStatus"
    );


const seatMoveConfirmButton =
    document.getElementById(
        "seatMoveConfirmButton"
    );


const seatMoveCancelButton =
    document.getElementById(
        "seatMoveCancelButton"
    );


// =====================================
// 状態
// =====================================

let selectionMode = false;

let isDragging = false;

let dragGroupName = null;

let dragMode = "select";

let bulkSeatMode = null;

let bulkTouchedSeats =
    new Set();

let bulkPendingSeats = [];


let seatMoveMode = false;

let moveSourceSeats = [];

let moveTargetSeats = [];

let moveReceptionId = null;

let moveDragging = false;

let moveDragType = null;

let moveTouchedSeats =
    new Set();


let currentSeatData = {};


// =====================================
// グループ
// =====================================

const groups = {

    ACEG: {

        blocks:
            ["A", "C", "E", "G"],

        waiting: [],

        receptionNumber: 0,

        confirmedCount: 0,

        currentCustomer: null,

        selectedSeats: [],

        selectedClass:
            "selected-aceg",

        prefix: "A",

        customerCountId:
            "acegCustomerCount",

        receptionButtonId:
            "acegReceptionButton",

        waitingCountId:
            "acegWaitingCount",

        confirmedCountId:
            "acegConfirmedCount",

        totalCountId:
            "acegTotalCount",

        nextButtonId:
            "acegNextButton",

        currentCustomerId:
            "acegCurrentCustomer",

        confirmButtonId:
            "acegConfirmButton",

        waitingListId:
            "acegWaitingList"
    },


    BDFH: {

        blocks:
            ["B", "D", "F", "H"],

        waiting: [],

        receptionNumber: 0,

        confirmedCount: 0,

        currentCustomer: null,

        selectedSeats: [],

        selectedClass:
            "selected-bdfh",

        prefix: "B",

        customerCountId:
            "bdfhCustomerCount",

        receptionButtonId:
            "bdfhReceptionButton",

        waitingCountId:
            "bdfhWaitingCount",

        confirmedCountId:
            "bdfhConfirmedCount",

        totalCountId:
            "bdfhTotalCount",

        nextButtonId:
            "bdfhNextButton",

        currentCustomerId:
            "bdfhCurrentCustomer",

        confirmButtonId:
            "bdfhConfirmButton",

        waitingListId:
            "bdfhWaitingList"
    }

};


// =====================================
// 受付番号ごとの色
// =====================================

const receptionColors = [
    "#1565c0",
    "#ef6c00",
    "#7b1fa2",
    "#00897b",
    "#d81b60",
    "#5d4037",
    "#3949ab",
    "#00838f",
    "#6a1b9a",
    "#ad1457",
    "#2e7d32",
    "#4527a0",
    "#0277bd",
    "#c62828",
    "#558b2f",
    "#6d4c41"
];


function getReceptionColor(
    receptionId
) {

    let hash = 0;


    for (
        let i = 0;
        i < receptionId.length;
        i++
    ) {

        hash =
            (
                hash * 31 +
                receptionId.charCodeAt(i)
            ) >>> 0;
    }


    return receptionColors[
        hash %
        receptionColors.length
    ];
}


// =====================================
// グループ判定
// =====================================

function getGroupName(
    block
) {

    if (
        groups.ACEG.blocks.includes(
            block
        )
    ) {

        return "ACEG";
    }


    return "BDFH";
}


// =====================================
// 受付状態保存
// =====================================

function saveReceptionState(
    groupName
) {

    const group =
        groups[groupName];


    const waiting =
        group.waiting.map(
            customer => ({

                number:
                    customer.number,

                count:
                    customer.count,

                time:
                    customer.time instanceof Date
                        ? customer.time.getTime()
                        : customer.time
            })
        );


    let currentCustomer =
        null;


    if (
        group.currentCustomer
    ) {

        currentCustomer = {

            number:
                group.currentCustomer.number,

            count:
                group.currentCustomer.count,

            time:
                group.currentCustomer.time instanceof Date
                    ? group.currentCustomer.time.getTime()
                    : group.currentCustomer.time
        };
    }


    return set(
        ref(
            database,
            "reception/" +
            groupName
        ),

        {
            receptionNumber:
                group.receptionNumber,

            confirmedCount:
                group.confirmedCount,

            waiting:
                waiting,

            currentCustomer:
                currentCustomer
        }
    );
}


// =====================================
// 受付同期
// =====================================

function setupReceptionSync(
    groupName
) {

    const group =
        groups[groupName];


    onValue(
        ref(
            database,
            "reception/" +
            groupName
        ),

        function (
            snapshot
        ) {

            const data =
                snapshot.val();


            if (!data) {

                saveReceptionState(
                    groupName
                );

                return;
            }


            group.receptionNumber =
                Number(
                    data.receptionNumber ||
                    0
                );


            group.confirmedCount =
                Number(
                    data.confirmedCount ||
                    0
                );


            if (
                data.waiting
            ) {

                const waitingData =
                    Array.isArray(
                        data.waiting
                    )
                        ? data.waiting
                        : Object.values(
                            data.waiting
                        );


                group.waiting =
                    waitingData
                        .filter(
                            item => item
                        )
                        .map(
                            customer => ({

                                number:
                                    Number(
                                        customer.number
                                    ),

                                count:
                                    Number(
                                        customer.count
                                    ),

                                time:
                                    new Date(
                                        customer.time
                                    )
                            })
                        );

            } else {

                group.waiting =
                    [];
            }


            if (
                data.currentCustomer
            ) {

                group.currentCustomer = {

                    number:
                        Number(
                            data.currentCustomer.number
                        ),

                    count:
                        Number(
                            data.currentCustomer.count
                        ),

                    time:
                        new Date(
                            data.currentCustomer.time
                        )
                };

            } else {

                group.currentCustomer =
                    null;
            }


            updateWaitingList(
                groupName
            );


            updatePeopleSummary(
                groupName
            );


            showCurrentCustomer(
                groupName
            );


            updateConfirmButton(
                groupName
            );
        }
    );
}


// =====================================
// 範囲選択モード
// =====================================

seatModeButton.addEventListener(
    "click",

    function () {

        if (
            seatMoveMode
        ) {

            return;
        }


        if (
            bulkPendingSeats.length >
            0
        ) {

            return;
        }


        selectionMode =
            !selectionMode;


        if (
            selectionMode
        ) {

            seatsArea.classList.add(
                "selection-mode"
            );


            seatModeButton.classList.add(
                "active"
            );


            seatModeButton.textContent =
                "範囲選択を終了";


            seatModeMessage.textContent =
                "選択モード：座席をなぞってください";

        } else {

            cancelBulkSelection();

            exitSelectionMode();
        }
    }
);


// =====================================
// 選択終了
// =====================================

function exitSelectionMode() {

    selectionMode = false;


    seatsArea.classList.remove(
        "selection-mode"
    );


    seatModeButton.classList.remove(
        "active"
    );


    seatModeButton.textContent =
        "範囲選択を開始";


    seatModeMessage.textContent =
        "通常モード：座席の上からスクロールできます";
}


// =====================================
// 座席作成
// =====================================

function createSeat(
    block,
    row,
    number
) {

    const button =
        document.createElement(
            "button"
        );


    button.className =
        "seat";


    button.dataset.block =
        block;


    button.dataset.row =
        row;


    button.dataset.number =
        number;


    button.innerHTML = `
        <span>${block}-${row}-${number}</span>
        <small>空席</small>
    `;


    button.addEventListener(
        "pointerdown",

        function (
            event
        ) {

            // 入替
            if (
                seatMoveMode
            ) {

                event.preventDefault();


                moveDragging =
                    true;


                moveTouchedSeats.clear();


                if (
                    button.classList.contains(
                        "used"
                    )
                ) {

                    moveDragType =
                        "source";

                } else {

                    moveDragType =
                        "target";
                }


                applySeatMoveDrag(
                    button
                );


                return;
            }


            // 通常スクロール
            if (
                !selectionMode
            ) {

                return;
            }


            if (
                bulkPendingSeats.length >
                0
            ) {

                return;
            }


            event.preventDefault();


            const groupName =
                getGroupName(
                    button.dataset.block
                );


            const group =
                groups[groupName];


            isDragging =
                true;


            dragGroupName =
                groupName;


            if (
                group.currentCustomer ===
                null
            ) {

                bulkTouchedSeats.clear();

                bulkPendingSeats = [];


                bulkSeatMode =
                    button.classList.contains(
                        "used"
                    )
                        ? "to-empty"
                        : "to-used";


                applyBulkSeatChange(
                    button
                );


                return;
            }


            if (
                button.classList.contains(
                    "used"
                )
            ) {

                isDragging =
                    false;

                return;
            }


            dragMode =
                button.classList.contains(
                    group.selectedClass
                )
                    ? "remove"
                    : "select";


            changeSeatByDrag(
                button
            );
        }
    );


    return button;
}


// =====================================
// 手動範囲変更
// =====================================

function applyBulkSeatChange(
    seat
) {

    if (
        !seat ||
        bulkTouchedSeats.has(
            seat
        )
    ) {

        return;
    }


    const groupName =
        getGroupName(
            seat.dataset.block
        );


    if (
        groupName !==
        dragGroupName
    ) {

        return;
    }


    bulkTouchedSeats.add(
        seat
    );


    if (
        bulkSeatMode ===
        "to-used"
    ) {

        if (
            seat.classList.contains(
                "used"
            )
        ) {

            return;
        }


        seat.classList.add(
            "bulk-pending-used"
        );


        bulkPendingSeats.push(
            seat
        );


        return;
    }


    if (
        bulkSeatMode ===
        "to-empty"
    ) {

        if (
            !seat.classList.contains(
                "used"
            )
        ) {

            return;
        }


        seat.classList.add(
            "bulk-pending-empty"
        );


        bulkPendingSeats.push(
            seat
        );
    }
}


// =====================================
// 案内中候補変更
// =====================================

function changeSeatByDrag(
    seat
) {

    if (
        !seat ||
        seat.classList.contains(
            "used"
        )
    ) {

        return;
    }


    const groupName =
        getGroupName(
            seat.dataset.block
        );


    if (
        groupName !==
        dragGroupName
    ) {

        return;
    }


    const group =
        groups[groupName];


    if (
        !group.currentCustomer
    ) {

        return;
    }


    if (
        dragMode ===
        "remove"
    ) {

        if (
            !seat.classList.contains(
                group.selectedClass
            )
        ) {

            return;
        }


        seat.classList.remove(
            group.selectedClass
        );


        group.selectedSeats =
            group.selectedSeats.filter(
                item =>
                    item !== seat
            );


        updateConfirmButton(
            groupName
        );


        return;
    }


    if (
        seat.classList.contains(
            group.selectedClass
        )
    ) {

        return;
    }


    if (
        group.selectedSeats.length >=
        group.currentCustomer.count
    ) {

        return;
    }


    seat.classList.add(
        group.selectedClass
    );


    group.selectedSeats.push(
        seat
    );


    updateConfirmButton(
        groupName
    );
}


// =====================================
// 通常ドラッグ
// =====================================

document.addEventListener(
    "pointermove",

    function (
        event
    ) {

        if (
            !selectionMode ||
            !isDragging ||
            seatMoveMode
        ) {

            return;
        }


        event.preventDefault();


        const element =
            document.elementFromPoint(
                event.clientX,
                event.clientY
            );


        const seat =
            element
                ?.closest(
                    ".seat"
                );


        if (!seat) {
            return;
        }


        const groupName =
            getGroupName(
                seat.dataset.block
            );


        if (
            groups[groupName]
                .currentCustomer ===
            null
        ) {

            applyBulkSeatChange(
                seat
            );

        } else {

            changeSeatByDrag(
                seat
            );
        }
    },

    {
        passive: false
    }
);


// =====================================
// 通常ドラッグ終了
// =====================================

function finishDrag() {

    if (
        !isDragging
    ) {

        return;
    }


    isDragging = false;


    if (
        bulkPendingSeats.length >
        0
    ) {

        showBulkActionBar();
    }


    dragGroupName = null;

    dragMode = "select";
}


document.addEventListener(
    "pointerup",
    finishDrag
);


document.addEventListener(
    "pointercancel",
    finishDrag
);


// =====================================
// 手動変更確認
// =====================================

function showBulkActionBar() {

    const count =
        bulkPendingSeats.length;


    if (
        bulkSeatMode ===
        "to-used"
    ) {

        bulkActionText.textContent =
            count +
            "席を使用中に変更しますか？";


        bulkConfirmButton.textContent =
            count +
            "席を使用中にする";

    } else {

        bulkActionText.textContent =
            count +
            "席を空席に戻しますか？";


        bulkConfirmButton.textContent =
            count +
            "席を空席に戻す";
    }


    bulkActionBar.classList.add(
        "show"
    );
}


// =====================================
// 手動変更確定
// =====================================

bulkConfirmButton.addEventListener(
    "click",

    async function () {

        const changes = {};


        bulkPendingSeats.forEach(
            seat => {

                const seatNumber =
                    seat
                        .querySelector(
                            "span"
                        )
                        .textContent;


                changes[
                    "seats/" +
                    seatNumber
                ] =
                    bulkSeatMode ===
                    "to-used"
                        ? {
                            used: true,
                            group: "MANUAL"
                        }
                        : null;
            }
        );


        await update(
            ref(database),
            changes
        );


        resetBulkSelection();

        exitSelectionMode();
    }
);


bulkCancelButton.addEventListener(
    "click",

    function () {

        cancelBulkSelection();

        exitSelectionMode();
    }
);


function cancelBulkSelection() {

    bulkPendingSeats.forEach(
        seat => {

            seat.classList.remove(
                "bulk-pending-used",
                "bulk-pending-empty"
            );
        }
    );


    resetBulkSelection();
}


function resetBulkSelection() {

    bulkActionBar.classList.remove(
        "show"
    );


    bulkPendingSeats = [];

    bulkTouchedSeats.clear();

    bulkSeatMode = null;

    dragGroupName = null;

    isDragging = false;
}


// =====================================
// 座席入替
// =====================================

seatMoveButton.addEventListener(
    "click",

    function () {

        if (
            seatMoveMode
        ) {

            cancelSeatMove();

            return;
        }


        cancelBulkSelection();

        exitSelectionMode();


        seatMoveMode = true;


        seatsArea.classList.add(
            "selection-mode"
        );


        seatMoveButton.classList.add(
            "active"
        );


        seatMoveButton.textContent =
            "座席入替を終了";


        seatMoveMessage.textContent =
            "使用中の座席をなぞって選択してください";


        seatMoveBar.classList.add(
            "show"
        );


        updateSeatMoveStatus();
    }
);


function applySeatMoveDrag(
    seat
) {

    if (
        !seat ||
        moveTouchedSeats.has(
            seat
        )
    ) {

        return;
    }


    moveTouchedSeats.add(
        seat
    );


    const seatNumber =
        seat
            .querySelector(
                "span"
            )
            .textContent;


    if (
        moveDragType ===
        "source"
    ) {

        if (
            !seat.classList.contains(
                "used"
            )
        ) {

            return;
        }


        if (
            moveSourceSeats.includes(
                seat
            )
        ) {

            return;
        }


        const seatData =
            currentSeatData[
                seatNumber
            ];


        if (!seatData) {
            return;
        }


        const receptionId =
            seatData === true
                ? "MANUAL"
                : (
                    seatData.receptionId ||
                    seatData.group ||
                    "MANUAL"
                );


        if (
            moveSourceSeats.length ===
            0
        ) {

            moveReceptionId =
                receptionId;

        } else if (
            receptionId !==
            moveReceptionId
        ) {

            return;
        }


        seat.classList.add(
            "move-source"
        );


        moveSourceSeats.push(
            seat
        );


        seatMoveMessage.textContent =
            "次に同じ数だけ空席をなぞってください";


        updateSeatMoveStatus();


        return;
    }


    if (
        moveDragType ===
        "target"
    ) {

        if (
            seat.classList.contains(
                "used"
            )
        ) {

            return;
        }


        if (
            moveSourceSeats.length ===
            0
        ) {

            return;
        }


        if (
            moveTargetSeats.includes(
                seat
            )
        ) {

            return;
        }


        if (
            moveTargetSeats.length >=
            moveSourceSeats.length
        ) {

            return;
        }


        seat.classList.add(
            "move-target"
        );


        moveTargetSeats.push(
            seat
        );


        updateSeatMoveStatus();
    }
}


document.addEventListener(
    "pointermove",

    function (
        event
    ) {

        if (
            !seatMoveMode ||
            !moveDragging
        ) {

            return;
        }


        event.preventDefault();


        const element =
            document.elementFromPoint(
                event.clientX,
                event.clientY
            );


        const seat =
            element
                ?.closest(
                    ".seat"
                );


        if (!seat) {
            return;
        }


        applySeatMoveDrag(
            seat
        );
    },

    {
        passive: false
    }
);


function finishSeatMoveDrag() {

    moveDragging = false;

    moveDragType = null;

    moveTouchedSeats.clear();
}


document.addEventListener(
    "pointerup",
    finishSeatMoveDrag
);


document.addEventListener(
    "pointercancel",
    finishSeatMoveDrag
);


function updateSeatMoveStatus() {

    seatMoveStatus.textContent =
        "移動元 " +
        moveSourceSeats.length +
        "席 ／ 移動先 " +
        moveTargetSeats.length +
        "席";


    seatMoveConfirmButton.disabled =
        moveSourceSeats.length === 0 ||
        moveSourceSeats.length !==
        moveTargetSeats.length;
}


seatMoveConfirmButton.addEventListener(
    "click",

    async function () {

        if (
            moveSourceSeats.length ===
            0 ||
            moveSourceSeats.length !==
            moveTargetSeats.length
        ) {

            return;
        }


        const changes = {};


        for (
            let i = 0;
            i < moveSourceSeats.length;
            i++
        ) {

            const sourceNumber =
                moveSourceSeats[i]
                    .querySelector("span")
                    .textContent;


            const targetNumber =
                moveTargetSeats[i]
                    .querySelector("span")
                    .textContent;


            const sourceData =
                currentSeatData[
                    sourceNumber
                ];


            if (!sourceData) {
                continue;
            }


            changes[
                "seats/" +
                targetNumber
            ] =
                sourceData;


            changes[
                "seats/" +
                sourceNumber
            ] =
                null;
        }


        await update(
            ref(database),
            changes
        );


        cancelSeatMove();


        alert(
            "座席を入れ替えました。"
        );
    }
);


seatMoveCancelButton.addEventListener(
    "click",
    cancelSeatMove
);


function cancelSeatMove() {

    moveSourceSeats.forEach(
        seat =>
            seat.classList.remove(
                "move-source"
            )
    );


    moveTargetSeats.forEach(
        seat =>
            seat.classList.remove(
                "move-target"
            )
    );


    moveSourceSeats = [];

    moveTargetSeats = [];

    moveReceptionId = null;

    moveDragging = false;

    moveDragType = null;

    moveTouchedSeats.clear();

    seatMoveMode = false;


    seatsArea.classList.remove(
        "selection-mode"
    );


    seatMoveBar.classList.remove(
        "show"
    );


    seatMoveButton.classList.remove(
        "active"
    );


    seatMoveButton.textContent =
        "座席入替を開始";


    seatMoveMessage.textContent =
        "入替モードはOFFです";


    updateSeatMoveStatus();
}


// =====================================
// ブロック作成
// =====================================

function createBlock(
    name,
    rules,
    reverse
) {

    const block =
        document.createElement(
            "div"
        );


    block.className =
        "block block-" +
        name;


    const title =
        document.createElement(
            "div"
        );


    title.className =
        "block-title";


    title.textContent =
        name +
        "ブロック";


    block.appendChild(
        title
    );


    const maxNumber =
        Math.max(
            ...rules.map(
                rule =>
                    rule.end
            )
        );


    rules.forEach(
        rule => {

            const row =
                document.createElement(
                    "div"
                );


            row.className =
                "seat-row";


            row.style.gridTemplateColumns =
                `repeat(${maxNumber}, var(--seat-width))`;


            for (
                let number =
                    rule.start;

                number <=
                    rule.end;

                number++
            ) {

                if (
                    rule.skip &&
                    rule.skip.includes(
                        number
                    )
                ) {

                    continue;
                }


                const seat =
                    createSeat(
                        name,
                        rule.row,
                        number
                    );


                seat.style.gridColumn =
                    !reverse
                        ? String(number)
                        : String(
                            maxNumber -
                            number +
                            1
                        );


                seat.style.gridRow =
                    "1";


                row.appendChild(
                    seat
                );
            }


            block.appendChild(
                row
            );
        }
    );


    return block;
}


// =====================================
// 座席ルール
// =====================================

function makeAB() {

    const rules = [];


    for (
        let row = 1;
        row <= 10;
        row++
    ) {

        rules.push({
            row,
            start: 1,
            end: 24
        });
    }


    for (
        let row = 11;
        row <= 13;
        row++
    ) {

        rules.push({
            row,
            start: 5,
            end: 24
        });
    }


    for (
        let row = 14;
        row <= 20;
        row++
    ) {

        rules.push({
            row,
            start: 13,
            end: 24
        });
    }


    return rules;
}


function makeCD() {

    const rules = [];


    for (
        let row = 21;
        row <= 22;
        row++
    ) {

        rules.push({
            row,
            start: 10,
            end: 42
        });
    }


    for (
        let row = 23;
        row <= 26;
        row++
    ) {

        rules.push({
            row,
            start: 1,
            end: 42
        });
    }


    for (
        let row = 27;
        row <= 28;
        row++
    ) {

        rules.push({
            row,
            start: 1,
            end: 36
        });
    }


    for (
        let row = 29;
        row <= 40;
        row++
    ) {

        rules.push({
            row,
            start: 1,
            end: 42
        });
    }


    return rules;
}


function makeC() {

    const rules =
        makeCD();


    rules[
        rules.length - 1
    ].skip = [
        20,
        21,
        23,
        24
    ];


    return rules;
}


function makeE() {

    const rules = [];


    for (
        let row = 41;
        row <= 59;
        row++
    ) {

        rules.push({
            row,
            start: 3,
            end: 42
        });
    }


    return rules;
}


function makeF() {

    const rules = [];


    for (
        let row = 41;
        row <= 59;
        row++
    ) {

        rules.push({
            row,
            start: 1,
            end: 42
        });
    }


    return rules;
}


function makeG() {

    const rules = [];


    for (
        let row = 60;
        row <= 71;
        row++
    ) {

        rules.push({
            row,
            start: 3,
            end: 36
        });
    }


    return rules;
}


function makeH() {

    const rules = [];


    for (
        let row = 60;
        row <= 71;
        row++
    ) {

        rules.push({
            row,
            start: 1,
            end: 36
        });
    }


    return rules;
}


// =====================================
// 座席表示
// =====================================

const seatPairs = [

    {
        left:
            createBlock(
                "A",
                makeAB(),
                false
            ),

        right:
            createBlock(
                "B",
                makeAB(),
                true
            )
    },

    {
        left:
            createBlock(
                "C",
                makeC(),
                false
            ),

        right:
            createBlock(
                "D",
                makeCD(),
                true
            )
    },

    {
        left:
            createBlock(
                "E",
                makeE(),
                false
            ),

        right:
            createBlock(
                "F",
                makeF(),
                true
            )
    },

    {
        left:
            createBlock(
                "G",
                makeG(),
                false
            ),

        right:
            createBlock(
                "H",
                makeH(),
                true
            )
    }

];


seatPairs.forEach(
    pair => {

        const pairArea =
            document.createElement(
                "div"
            );


        pairArea.className =
            "block-pair";


        pairArea.appendChild(
            pair.left
        );


        pairArea.appendChild(
            pair.right
        );


        seatsArea.appendChild(
            pairArea
        );
    }
);


// =====================================
// 連続空席
// =====================================

function getContinuousSeatGroups(
    row
) {

    const seats =
        Array.from(
            row.querySelectorAll(
                ".seat:not(.used)"
            )
        );


    seats.sort(
        (a, b) =>
            Number(
                a.dataset.number
            ) -
            Number(
                b.dataset.number
            )
    );


    const result = [];

    let current = [];


    seats.forEach(
        seat => {

            const number =
                Number(
                    seat.dataset.number
                );


            if (
                current.length ===
                0
            ) {

                current.push(
                    seat
                );

                return;
            }


            const previous =
                Number(
                    current[
                        current.length - 1
                    ].dataset.number
                );


            if (
                number ===
                previous + 1
            ) {

                current.push(
                    seat
                );

            } else {

                result.push(
                    current
                );


                current =
                    [seat];
            }
        }
    );


    if (
        current.length >
        0
    ) {

        result.push(
            current
        );
    }


    return result;
}


// =====================================
// 自動座席候補
// =====================================

function findSuggestedSeats(
    groupName,
    count
) {

    const group =
        groups[groupName];


    // 1列でまとまる
    for (
        const blockName
        of group.blocks
    ) {

        const block =
            document.querySelector(
                ".block-" +
                blockName
            );


        if (!block) {
            continue;
        }


        const rows =
            block.querySelectorAll(
                ".seat-row"
            );


        for (
            const row
            of rows
        ) {

            const groupsInRow =
                getContinuousSeatGroups(
                    row
                );


            for (
                const seats
                of groupsInRow
            ) {

                if (
                    seats.length >=
                    count
                ) {

                    return seats.slice(
                        0,
                        count
                    );
                }
            }
        }
    }


    // 同ブロックで折り返し
    for (
        const blockName
        of group.blocks
    ) {

        const block =
            document.querySelector(
                ".block-" +
                blockName
            );


        if (!block) {
            continue;
        }


        const rows =
            Array.from(
                block.querySelectorAll(
                    ".seat-row"
                )
            );


        for (
            let startRow = 0;
            startRow < rows.length;
            startRow++
        ) {

            const selected = [];


            for (
                let rowIndex =
                    startRow;

                rowIndex <
                    rows.length;

                rowIndex++
            ) {

                const groupsInRow =
                    getContinuousSeatGroups(
                        rows[
                            rowIndex
                        ]
                    );


                if (
                    groupsInRow.length ===
                    0
                ) {

                    break;
                }


                groupsInRow.sort(
                    (a, b) =>
                        b.length -
                        a.length
                );


                const best =
                    groupsInRow[0];


                for (
                    const seat
                    of best
                ) {

                    selected.push(
                        seat
                    );


                    if (
                        selected.length ===
                        count
                    ) {

                        return selected;
                    }
                }
            }
        }
    }


    return [];
}


function suggestSeats(
    groupName
) {

    const group =
        groups[groupName];


    clearSelected(
        groupName
    );


    if (
        !group.currentCustomer
    ) {

        return;
    }


    const seats =
        findSuggestedSeats(
            groupName,
            group.currentCustomer.count
        );


    if (
        seats.length !==
        group.currentCustomer.count
    ) {

        alert(
            group.currentCustomer.count +
            "名様分の空席がありません。"
        );


        updateConfirmButton(
            groupName
        );


        return;
    }


    group.selectedSeats =
        seats;


    seats.forEach(
        seat =>
            seat.classList.add(
                group.selectedClass
            )
    );


    updateConfirmButton(
        groupName
    );
}


// =====================================
// 受付設定
// =====================================

function setupReception(
    groupName
) {

    const group =
        groups[groupName];


    document
        .getElementById(
            group.receptionButtonId
        )
        .addEventListener(
            "click",

            function () {

                const input =
                    document.getElementById(
                        group.customerCountId
                    );


                const count =
                    Number(
                        input.value
                    );


                if (
                    !Number.isInteger(
                        count
                    ) ||
                    count < 1
                ) {

                    alert(
                        "人数を入力してください。"
                    );


                    return;
                }


                group.receptionNumber++;


                group.waiting.push({

                    number:
                        group.receptionNumber,

                    count:
                        count,

                    time:
                        new Date()
                });


                input.value =
                    "";


                updateWaitingList(
                    groupName
                );


                updatePeopleSummary(
                    groupName
                );


                saveReceptionState(
                    groupName
                );
            }
        );


    document
        .getElementById(
            group.nextButtonId
        )
        .addEventListener(
            "click",

            function () {

                if (
                    group.currentCustomer
                ) {

                    alert(
                        "現在案内中のお客様がいます。"
                    );


                    return;
                }


                if (
                    group.waiting.length ===
                    0
                ) {

                    alert(
                        "待っているお客様はいません。"
                    );


                    return;
                }


                group.currentCustomer =
                    group.waiting.shift();


                updateWaitingList(
                    groupName
                );


                updatePeopleSummary(
                    groupName
                );


                showCurrentCustomer(
                    groupName
                );


                saveReceptionState(
                    groupName
                );


                suggestSeats(
                    groupName
                );
            }
        );


    document
        .getElementById(
            group.confirmButtonId
        )
        .addEventListener(
            "click",

            function () {

                confirmSeats(
                    groupName
                );
            }
        );
}


// =====================================
// 座席確定
// =====================================

async function confirmSeats(
    groupName
) {

    const group =
        groups[groupName];


    if (
        !group.currentCustomer
    ) {

        return;
    }


    if (
        group.selectedSeats.length !==
        group.currentCustomer.count
    ) {

        alert(
            group.currentCustomer.count +
            "席選択してください。"
        );


        return;
    }


    const confirmedCustomer =
        group.currentCustomer;


    const receptionId =
        group.prefix +
        "-" +
        confirmedCustomer.number;


    const changes = {};


    group.selectedSeats.forEach(
        seat => {

            const seatNumber =
                seat
                    .querySelector(
                        "span"
                    )
                    .textContent;


            changes[
                "seats/" +
                seatNumber
            ] = {

                used: true,

                group:
                    groupName,

                receptionId:
                    receptionId,

                receptionNumber:
                    confirmedCustomer.number
            };
        }
    );


    await update(
        ref(database),
        changes
    );


    group.confirmedCount +=
        confirmedCustomer.count;


    clearSelected(
        groupName
    );


    group.currentCustomer =
        null;


    await saveReceptionState(
        groupName
    );


    updatePeopleSummary(
        groupName
    );


    showCurrentCustomer(
        groupName
    );


    updateConfirmButton(
        groupName
    );


    exitSelectionMode();
}


// =====================================
// 候補解除
// =====================================

function clearSelected(
    groupName
) {

    const group =
        groups[groupName];


    group.selectedSeats.forEach(
        seat =>
            seat.classList.remove(
                group.selectedClass
            )
    );


    group.selectedSeats = [];
}


// =====================================
// 確定ボタン
// =====================================

function updateConfirmButton(
    groupName
) {

    const group =
        groups[groupName];


    const button =
        document.getElementById(
            group.confirmButtonId
        );


    if (
        !group.currentCustomer
    ) {

        button.disabled =
            true;


        button.textContent =
            "座席を確定";


        return;
    }


    button.textContent =
        "座席を確定 (" +
        group.selectedSeats.length +
        "/" +
        group.currentCustomer.count +
        ")";


    button.disabled =
        group.selectedSeats.length !==
        group.currentCustomer.count;
}


// =====================================
// 待ち一覧
// =====================================

function updateWaitingList(
    groupName
) {

    const group =
        groups[groupName];


    const list =
        document.getElementById(
            group.waitingListId
        );


    if (
        group.waiting.length ===
        0
    ) {

        list.innerHTML =
            "待ちはありません";


        return;
    }


    list.innerHTML = "";


    group.waiting.forEach(
        (
            customer,
            index
        ) => {

            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "waiting-item";


            const time =
                customer.time
                    .toLocaleTimeString(
                        "ja-JP",

                        {
                            hour:
                                "2-digit",

                            minute:
                                "2-digit"
                        }
                    );


            const text =
                document.createElement(
                    "span"
                );


            text.textContent =
                (index + 1) +
                "番目　受付番号 " +
                group.prefix +
                "-" +
                customer.number +
                "　" +
                customer.count +
                "名様　" +
                time;


            const editButton =
                document.createElement(
                    "button"
                );


            editButton.className =
                "waiting-edit-button";


            editButton.textContent =
                "人数変更";


            editButton.addEventListener(
                "click",

                function () {

                    changeWaitingCustomerCount(
                        groupName,
                        customer.number
                    );
                }
            );


            item.appendChild(
                text
            );


            item.appendChild(
                editButton
            );


            list.appendChild(
                item
            );
        }
    );
}


// =====================================
// 人数変更
// =====================================

function changeWaitingCustomerCount(
    groupName,
    receptionNumber
) {

    const group =
        groups[groupName];


    const customer =
        group.waiting.find(
            item =>
                item.number ===
                receptionNumber
        );


    if (!customer) {
        return;
    }


    const input =
        prompt(
            "現在：" +
            customer.count +
            "名\n\n" +
            "新しい人数を入力してください。",
            customer.count
        );


    if (
        input === null
    ) {

        return;
    }


    const newCount =
        Number(input);


    if (
        !Number.isInteger(
            newCount
        ) ||
        newCount < 1
    ) {

        alert(
            "1名以上の整数を入力してください。"
        );


        return;
    }


    customer.count =
        newCount;


    updateWaitingList(
        groupName
    );


    updatePeopleSummary(
        groupName
    );


    saveReceptionState(
        groupName
    );
}


// =====================================
// 使用中座席数
// =====================================

function getUsedSeatCount(
    groupName
) {

    const group =
        groups[groupName];


    let count = 0;


    group.blocks.forEach(
        blockName => {

            const block =
                document.querySelector(
                    ".block-" +
                    blockName
                );


            if (!block) {
                return;
            }


            count +=
                block.querySelectorAll(
                    ".seat.used"
                ).length;
        }
    );


    return count;
}


// =====================================
// 人数集計
// =====================================

function updatePeopleSummary(
    groupName
) {

    const group =
        groups[groupName];


    const waitingPeople =
        group.waiting.reduce(
            (
                total,
                customer
            ) =>
                total +
                customer.count,
            0
        );


    const currentPeople =
        group.currentCustomer
            ? group.currentCustomer.count
            : 0;


    const usedSeatCount =
        getUsedSeatCount(
            groupName
        );


    const totalPeople =
        usedSeatCount +
        waitingPeople +
        currentPeople;


    document.getElementById(
        group.confirmedCountId
    ).textContent =
        usedSeatCount;


    document.getElementById(
        group.waitingCountId
    ).textContent =
        waitingPeople;


    document.getElementById(
        group.totalCountId
    ).textContent =
        totalPeople;


    updatePeopleDifference();
}


// =====================================
// ACEG・BDFH人数差
// =====================================

function updatePeopleDifference() {

    const acegTotal =
        Number(
            document.getElementById(
                "acegTotalCount"
            ).textContent ||
            0
        );


    const bdfhTotal =
        Number(
            document.getElementById(
                "bdfhTotalCount"
            ).textContent ||
            0
        );


    const difference =
        Math.abs(
            acegTotal -
            bdfhTotal
        );


    document.getElementById(
        "peopleDifferenceCount"
    ).textContent =
        difference +
        "人";


    const message =
        document.getElementById(
            "peopleDifferenceMessage"
        );


    if (
        acegTotal >
        bdfhTotal
    ) {

        message.textContent =
            "ACEGが" +
            difference +
            "人多い";

    } else if (
        bdfhTotal >
        acegTotal
    ) {

        message.textContent =
            "BDFHが" +
            difference +
            "人多い";

    } else {

        message.textContent =
            "同数です";
    }
}


// =====================================
// 案内中
// =====================================

function showCurrentCustomer(
    groupName
) {

    const group =
        groups[groupName];


    const area =
        document.getElementById(
            group.currentCustomerId
        );


    if (
        !group.currentCustomer
    ) {

        area.innerHTML =
            "現在案内中のお客様はいません";


        return;
    }


    area.innerHTML = `

        <div>
            受付番号
            ${group.prefix}-${group.currentCustomer.number}
        </div>

        <div>
            ${group.currentCustomer.count}名様
        </div>

        <div>
            自動選択された座席を確認してください
        </div>
    `;
}


// =====================================
// 完全リセット
// =====================================

resetOpenButton.addEventListener(
    "click",

    function () {

        resetConfirmArea.classList.add(
            "show"
        );
    }
);


resetCancelButton.addEventListener(
    "click",

    function () {

        resetConfirmArea.classList.remove(
            "show"
        );
    }
);


resetExecuteButton.addEventListener(
    "click",

    async function () {

        resetExecuteButton.disabled =
            true;


        resetExecuteButton.textContent =
            "リセット中…";


        try {

            await remove(
                ref(
                    database,
                    "seats"
                )
            );


            await set(
                ref(
                    database,
                    "reception"
                ),

                {
                    ACEG: {
                        receptionNumber: 0,
                        confirmedCount: 0,
                        waiting: [],
                        currentCustomer: null
                    },

                    BDFH: {
                        receptionNumber: 0,
                        confirmedCount: 0,
                        waiting: [],
                        currentCustomer: null
                    }
                }
            );


            clearSelected(
                "ACEG"
            );


            clearSelected(
                "BDFH"
            );


            cancelBulkSelection();

            cancelSeatMove();

            exitSelectionMode();


            resetConfirmArea.classList.remove(
                "show"
            );


            alert(
                "完全リセットしました。"
            );

        } finally {

            resetExecuteButton.disabled =
                false;


            resetExecuteButton.textContent =
                "完全リセットを確定";
        }
    }
);


// =====================================
// 初期設定
// =====================================

setupReception(
    "ACEG"
);


setupReception(
    "BDFH"
);


setupReceptionSync(
    "ACEG"
);


setupReceptionSync(
    "BDFH"
);


updateWaitingList(
    "ACEG"
);


updateWaitingList(
    "BDFH"
);


showCurrentCustomer(
    "ACEG"
);


showCurrentCustomer(
    "BDFH"
);


updateConfirmButton(
    "ACEG"
);


updateConfirmButton(
    "BDFH"
);


// =====================================
// 座席Firebase同期
// =====================================

onValue(
    ref(
        database,
        "seats"
    ),

    function (
        snapshot
    ) {

        const data =
            snapshot.val() ||
            {};


        currentSeatData =
            data;


        document
            .querySelectorAll(
                ".seat"
            )
            .forEach(
                seat => {

                    const seatNumber =
                        seat
                            .querySelector(
                                "span"
                            )
                            .textContent;


                    const small =
                        seat
                            .querySelector(
                                "small"
                            );


                    const seatData =
                        data[
                            seatNumber
                        ];


                    seat.classList.remove(
                        "used",
                        "used-manual"
                    );


                    seat.style.background =
                        "";


                    if (
                        !seatData
                    ) {

                        small.textContent =
                            "空席";


                        return;
                    }


                    seat.classList.add(
                        "used"
                    );


                    if (
                        seatData === true
                    ) {

                        seat.classList.add(
                            "used-manual"
                        );


                        seat.style.background =
                            "#e53935";


                        small.textContent =
                            "手動";


                        return;
                    }


                    if (
                        seatData.receptionId
                    ) {

                        seat.style.background =
                            getReceptionColor(
                                seatData.receptionId
                            );


                        small.textContent =
                            seatData.receptionId;


                        return;
                    }


                    if (
                        seatData.group ===
                        "MANUAL"
                    ) {

                        seat.classList.add(
                            "used-manual"
                        );


                        seat.style.background =
                            "#e53935";


                        small.textContent =
                            "手動";


                        return;
                    }


                    small.textContent =
                        "使用中";
                }
            );


        updatePeopleSummary(
            "ACEG"
        );


        updatePeopleSummary(
            "BDFH"
        );
    }
);