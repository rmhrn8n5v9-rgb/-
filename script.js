import { initializeApp } from
"https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";

import {
    getDatabase,
    ref,
    set,
    onValue,
    remove
} from
"https://www.gstatic.com/firebasejs/12.2.1/firebase-database.js";

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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
const seatsArea =
    document.getElementById("seats");


// =====================================
// ドラッグ・範囲選択
// =====================================

let isDragging = false;

let dragGroupName = null;

let dragMode = "select";

let bulkSeatMode = null;

let bulkTouchedSeats = new Set();

let bulkPendingSeats = [];

// =====================================
// 受付グループ
// =====================================

const groups = {

    ACEG: {

        blocks: ["A", "C", "E", "G"],

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

        blocks: ["B", "D", "F", "H"],

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
// ブロックがどちらの受付か
// =====================================

function getGroupName(block) {

    if (
        groups.ACEG.blocks.includes(block)
    ) {

        return "ACEG";
    }


    return "BDFH";
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
        document.createElement("button");


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


    // =================================
    // 座席を押した
    // =================================

button.addEventListener(
    "pointerdown",
    function (event) {

        event.preventDefault();

        const groupName =
            getGroupName(
                button.dataset.block
            );

        const group =
            groups[groupName];


        // =====================================
        // 案内中ではない
        // → 空席/使用中をなぞって一括変更
        // =====================================

        if (
            group.currentCustomer === null
        ) {

            isDragging = true;

            dragGroupName =
                groupName;

            bulkTouchedSeats.clear();


            // 最初に触った席でモードを決める
            if (
                button.classList.contains(
                    "used"
                )
            ) {

                bulkSeatMode =
                    "to-empty";

            } else {

                bulkSeatMode =
                    "to-used";
            }


            applyBulkSeatChange(
                button
            );

            return;
        }


        // =====================================
        // 案内中
        // → 今まで通り候補席選択
        // =====================================

        if (
            button.classList.contains("used")
        ) {
            return;
        }


        isDragging =
            true;

        dragGroupName =
            groupName;


        if (
            button.classList.contains(
                group.selectedClass
            )
        ) {

            dragMode =
                "remove";

        } else {

            dragMode =
                "select";
        }


        changeSeatByDrag(
            button
        );
    }
);

    return button;
}


// =====================================
// 空席 ⇄ 使用中
// =====================================

function manualChangeSeat(seat) {

    const seatNumber =
        seat
            .querySelector("span")
            .textContent;


    // =================================
    // 使用中 → 空席
    // =================================

    if (
        seat.classList.contains("used")
    ) {

        const result =
            confirm(
                seatNumber +
                " は使用中です。\n\n" +
                "空席に戻しますか？"
            );


        if (!result) {
            return;
        }


        seat.classList.remove(
            "used"
        );


        seat
            .querySelector("small")
            .textContent =
            "空席";
remove(
    ref(
        database,
        "seats/" + seatNumber
    )
);

        return;
    }


    // =================================
    // 空席 → 使用中
    // =================================

    const result =
        confirm(
            seatNumber +
                " は空席です。\n\n" +
                "使用中に変更しますか？"
        );


    if (!result) {
        return;
    }


    seat.classList.add(
        "used"
    );


    seat
        .querySelector("small")
        .textContent =
        "使用中";
set(
    ref(
        database,
        "seats/" + seatNumber
    ),
    true
);
}


// =====================================
// なぞって座席を選択・解除
// =====================================

function changeSeatByDrag(seat) {

    if (!seat) {
        return;
    }


    if (
        !seat.classList.contains("seat")
    ) {

        return;
    }


    if (
        seat.classList.contains("used")
    ) {

        return;
    }


    const groupName =
        getGroupName(
            seat.dataset.block
        );


    // ACEGからBDFHへは
    // ドラッグをまたがせない
    if (
        groupName !==
        dragGroupName
    ) {

        return;
    }


    const group =
        groups[groupName];


    if (
        group.currentCustomer === null
    ) {

        return;
    }


    // =================================
    // 選択解除モード
    // =================================

    if (
        dragMode === "remove"
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


    // =================================
    // 選択モード
    // =================================

    if (
        seat.classList.contains(
            group.selectedClass
        )
    ) {

        return;
    }


    // 人数に達した
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
// 指を動かしている位置の席を取得
// =====================================

document.addEventListener(
    "pointermove",
    function (event) {

        if (!isDragging) {
            return;
        }


        event.preventDefault();


        const element =
            document.elementFromPoint(
                event.clientX,
                event.clientY
            );


        if (!element) {
            return;
        }


        const seat =
            element.closest(".seat");


        if (!seat) {
            return;
        }


const groupName =
    getGroupName(
        seat.dataset.block
    );

const group =
    groups[groupName];


if (
    group.currentCustomer === null
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
// 指を離す
// =====================================

function endDragging() {

    if (!isDragging) {
        return;
    }


    isDragging = false;


    // =================================
    // ドラッグ変更の確認
    // =================================

    if (
        bulkPendingSeats.length > 0
    ) {

        const count =
            bulkPendingSeats.length;


        let message = "";


        if (
            bulkSeatMode === "to-used"
        ) {

            message =
                count +
                "席を使用中に変更しますか？";

        } else if (
            bulkSeatMode === "to-empty"
        ) {

            message =
                count +
                "席を空席に戻しますか？";
        }


        const result =
            confirm(message);


        // =================================
        // OK → 確定
        // =================================

        if (result) {

            bulkPendingSeats.forEach(
                seat => {

                    const seatNumber =
                        seat
                            .querySelector("span")
                            .textContent;


                    // 空席 → 使用中
                    if (
                        bulkSeatMode ===
                        "to-used"
                    ) {

                        seat.classList.remove(
                            "bulk-pending-used"
                        );

                        seat.classList.add(
                            "used"
                        );

                        seat
                            .querySelector("small")
                            .textContent =
                            "使用中";


                        set(
                            ref(
                                database,
                                "seats/" +
                                seatNumber
                            ),
                            true
                        );
                    }


                    // 使用中 → 空席
                    if (
                        bulkSeatMode ===
                        "to-empty"
                    ) {

                        seat.classList.remove(
                            "bulk-pending-empty"
                        );

                        seat.classList.remove(
                            "used"
                        );

                        seat
                            .querySelector("small")
                            .textContent =
                            "空席";


                        remove(
                            ref(
                                database,
                                "seats/" +
                                seatNumber
                            )
                        );
                    }

                }
            );

        }

        // =================================
        // キャンセル
        // → 仮選択解除
        // =================================

        else {

            bulkPendingSeats.forEach(
                seat => {

                    seat.classList.remove(
                        "bulk-pending-used"
                    );

                    seat.classList.remove(
                        "bulk-pending-empty"
                    );

                }
            );
        }
    }


    dragGroupName = null;

    dragMode = "select";

    bulkSeatMode = null;

    bulkTouchedSeats.clear();

    bulkPendingSeats = [];
}


// =====================================
// ブロックを作る
// =====================================

function createBlock(

    name,
    rules,
    reverse
) {

    const block =
        document.createElement("div");


    block.className =
        "block block-" + name;


    const title =
        document.createElement("div");


    title.className =
        "block-title";


    title.textContent =
        name + "ブロック";


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

                // 欠番
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


                // ACEG
                if (!reverse) {

                    seat.style.gridColumn =
                        String(number);

                }

                // BDFH
                // 右から1番
                else {

                    seat.style.gridColumn =
                        String(
                            maxNumber -
                            number +
                            1
                        );

                }


                // 斜め防止
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
// A・B
//
// 1〜10 → 1〜24
// 11〜13 → 5〜24
// 14〜20 → 13〜24
// =====================================

function makeAB() {

    const rules = [];


    for (
        let row = 1;
        row <= 10;
        row++
    ) {

        rules.push({
            row: row,
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
            row: row,
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
            row: row,
            start: 13,
            end: 24
        });

    }


    return rules;
}


// =====================================
// C・D
// =====================================

function makeCD() {

    const rules = [];


    // 21〜22 → 10〜42
    for (
        let row = 21;
        row <= 22;
        row++
    ) {

        rules.push({
            row: row,
            start: 10,
            end: 42
        });

    }


    // 23〜26 → 1〜42
    for (
        let row = 23;
        row <= 26;
        row++
    ) {

        rules.push({
            row: row,
            start: 1,
            end: 42
        });

    }


    // 27〜28 → 1〜36
    for (
        let row = 27;
        row <= 28;
        row++
    ) {

        rules.push({
            row: row,
            start: 1,
            end: 36
        });

    }


    // 29〜40 → 1〜42
    for (
        let row = 29;
        row <= 40;
        row++
    ) {

        rules.push({
            row: row,
            start: 1,
            end: 42
        });

    }


    return rules;
}


// =====================================
// Cだけ欠番
//
// C-40-20
// C-40-21
// C-40-23
// C-40-24
// =====================================

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


// =====================================
// E
// 41〜59 → 3〜42
// =====================================

function makeE() {

    const rules = [];


    for (
        let row = 41;
        row <= 59;
        row++
    ) {

        rules.push({
            row: row,
            start: 3,
            end: 42
        });

    }


    return rules;
}


// =====================================
// F
// 41〜59 → 1〜42
// =====================================

function makeF() {

    const rules = [];


    for (
        let row = 41;
        row <= 59;
        row++
    ) {

        rules.push({
            row: row,
            start: 1,
            end: 42
        });

    }


    return rules;
}


// =====================================
// G
// 60〜71 → 3〜36
// =====================================

function makeG() {

    const rules = [];


    for (
        let row = 60;
        row <= 71;
        row++
    ) {

        rules.push({
            row: row,
            start: 3,
            end: 36
        });

    }


    return rules;
}


// =====================================
// H
// 60〜71 → 1〜36
// =====================================

function makeH() {

    const rules = [];


    for (
        let row = 60;
        row <= 71;
        row++
    ) {

        rules.push({
            row: row,
            start: 1,
            end: 36
        });

    }


    return rules;
}


// =====================================
// 座席表
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


// =====================================
// 座席表示
// =====================================

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
// 自動座席選択
//
// 1番から順番
//
// 足りなければ
// 次の列・次のブロックへ
// =====================================

function findSuggestedSeats(
    groupName,
    count
) {

    const group =
        groups[groupName];


    const selected =
        [];


    // ACEG
    // A → C → E → G

    // BDFH
    // B → D → F → H

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

            const availableSeats =
                Array.from(
                    row.querySelectorAll(
                        ".seat:not(.used)"
                    )
                );


            // 1番から
            availableSeats.sort(
                (a, b) =>
                    Number(
                        a.dataset.number
                    ) -
                    Number(
                        b.dataset.number
                    )
            );


            for (
                const seat
                of availableSeats
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


    return [];
}


// =====================================
// 自動候補表示
// =====================================

function suggestSeats(
    groupName
) {

    const group =
        groups[groupName];


    clearSelected(
        groupName
    );


    const seats =
        findSuggestedSeats(
            groupName,
            group.currentCustomer.count
        );


    if (
        seats.length === 0
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
        seat => {

            seat.classList.add(
                group.selectedClass
            );

        }
    );


    updateConfirmButton(
        groupName
    );
}


// =====================================
// 受付を設定
// =====================================

function setupReception(
    groupName
) {

    const group =
        groups[groupName];


    // =================================
    // 受付
    // =================================

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
                    !Number.isInteger(count) ||
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
                    1;


                updateWaitingList(
                    groupName
                );


                updatePeopleSummary(
                    groupName
                );


                alert(
                    groupName +
                    "受付\n\n" +
                    "受付番号 " +
                    group.prefix +
                    "-" +
                    group.receptionNumber +
                    "\n" +
                    count +
                    "名様"
                );

            }
        );


    // =================================
    // 次のお客様
    // =================================

    document
        .getElementById(
            group.nextButtonId
        )
        .addEventListener(
            "click",
            function () {

                if (
                    group.currentCustomer !==
                    null
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


                // 自動で候補席
                suggestSeats(
                    groupName
                );

            }
        );


    // =================================
    // 座席確定
    // =================================

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

function confirmSeats(
    groupName
) {

    const group =
        groups[groupName];


    if (
        group.currentCustomer === null
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


    const seatNames =
        [];


    group.selectedSeats.forEach(
        seat => {

            seat.classList.remove(
                group.selectedClass
            );


            seat.classList.add(
                "used"
            );


            seat
                .querySelector("small")
                .textContent =
                "使用中";
const seatNumber =
    seat
        .querySelector("span")
        .textContent;

set(
    ref(
        database,
        "seats/" + seatNumber
    ),
    true
);

            seatNames.push(
                seat
                    .querySelector("span")
                    .textContent
            );

        }
    );


    const confirmedCustomer =
        group.currentCustomer;


    // 確定人数を追加
    group.confirmedCount +=
        confirmedCustomer.count;


    group.selectedSeats =
        [];


    group.currentCustomer =
        null;


    updatePeopleSummary(
        groupName
    );


    showCurrentCustomer(
        groupName
    );


    updateConfirmButton(
        groupName
    );


    alert(
        "受付番号 " +
        group.prefix +
        "-" +
        confirmedCustomer.number +
        "\n" +
        confirmedCustomer.count +
        "名様\n\n" +
        "座席を確定しました。\n\n" +
        seatNames.join(" / ")
    );
}


// =====================================
// 候補席を解除
// =====================================

function clearSelected(
    groupName
) {

    const group =
        groups[groupName];


    group.selectedSeats.forEach(
        seat => {

            seat.classList.remove(
                group.selectedClass
            );

        }
    );


    group.selectedSeats =
        [];
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
        group.currentCustomer === null
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


    list.innerHTML =
        "";


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


            item.textContent =
                (index + 1) +
                "番目　受付番号 " +
                group.prefix +
                "-" +
                customer.number +
                "　" +
                customer.count +
                "名様　" +
                time;


            list.appendChild(
                item
            );

        }
    );
}


// =====================================
// 人数集計
//
// 確定人数
// 待ち人数
// 合計人数
// =====================================

function updatePeopleSummary(
    groupName
) {

    const group =
        groups[groupName];


    // 待っている人数
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


    // 現在案内中
    const currentPeople =
        group.currentCustomer
            ? group.currentCustomer.count
            : 0;


    // 確定人数
    const confirmedPeople =
        group.confirmedCount;


    // 合計
    const totalPeople =
        confirmedPeople +
        waitingPeople +
        currentPeople;


    const confirmedArea =
        document.getElementById(
            group.confirmedCountId
        );


    const waitingArea =
        document.getElementById(
            group.waitingCountId
        );


    const totalArea =
        document.getElementById(
            group.totalCountId
        );


    if (confirmedArea) {

        confirmedArea.textContent =
            confirmedPeople;
    }


    if (waitingArea) {

        waitingArea.textContent =
            waitingPeople;
    }


    if (totalArea) {

        totalArea.textContent =
            totalPeople;
    }
}


// =====================================
// 現在案内中
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
        group.currentCustomer === null
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

        <div>
            指で座席をなぞると変更できます
        </div>
    `;
}


// =====================================
// 初期設定
// =====================================

setupReception(
    "ACEG"
);


setupReception(
    "BDFH"
);


updateWaitingList(
    "ACEG"
);


updateWaitingList(
    "BDFH"
);


updatePeopleSummary(
    "ACEG"
);


updatePeopleSummary(
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
// Firebaseから座席状態をリアルタイム受信
// =====================================

onValue(
    ref(database, "seats"),
    function (snapshot) {

        const data =
            snapshot.val() || {};


        document
            .querySelectorAll(".seat")
            .forEach(
                seat => {

                    const seatNumber =
                        seat
                            .querySelector("span")
                            .textContent;


                    if (data[seatNumber]) {

                        seat.classList.add(
                            "used"
                        );

                        seat
                            .querySelector("small")
                            .textContent =
                            "使用中";

                    } else {

                        seat.classList.remove(
                            "used"
                        );

                        seat
                            .querySelector("small")
                            .textContent =
                            "空席";
                    }

                }
            );
    }
);
// =====================================
// 案内中ではないとき
// 座席をなぞって一括変更
// =====================================

function applyBulkSeatChange(seat) {

    if (!seat) {
        return;
    }

    if (!seat.classList.contains("seat")) {
        return;
    }

    if (bulkTouchedSeats.has(seat)) {
        return;
    }

    const groupName =
        getGroupName(
            seat.dataset.block
        );

    if (
        groupName !== dragGroupName
    ) {
        return;
    }

    bulkTouchedSeats.add(seat);


    // =================================
    // 空席 → 使用中 の仮選択
    // =================================

    if (
        bulkSeatMode === "to-used"
    ) {

        if (
            seat.classList.contains("used")
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


    // =================================
    // 使用中 → 空席 の仮選択
    // =================================

    if (
        bulkSeatMode === "to-empty"
    ) {

        if (
            !seat.classList.contains("used")
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
