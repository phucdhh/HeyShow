// Bản sao bài trình chiếu nằm trong IndexedDB của trình duyệt, phục vụ tab Sync của Dashboard.
//
// Đây là đường về nhà thứ hai bên cạnh file .zip: không chiếm hạn mức bài trên server,
// không cần tải thủ công, và vẫn mở được khi server gặp sự cố. Đổi lại nó chỉ sống trên
// đúng máy + đúng trình duyệt này, và mất khi người dùng xoá dữ liệu duyệt web.

const DB_NAME = 'heyshow-backup';
const STORE = 'decks';
const VERSION = 1;

let dbPromise = null;

export function isSupported() {
    return typeof indexedDB !== 'undefined' && indexedDB !== null;
}

function openDb() {
    if (!dbPromise) {
        dbPromise = new Promise((resolve, reject) => {
            const req = indexedDB.open(DB_NAME, VERSION);
            req.onupgradeneeded = () => {
                const db = req.result;
                if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'fileName' });
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error || new Error('Trình duyệt chặn IndexedDB'));
            req.onblocked = () => reject(new Error('IndexedDB đang bị một tab khác giữ. Hãy đóng tab đó rồi thử lại.'));
        });
    }
    return dbPromise;
}

// Một lần chuyển cho mọi thao tác ghi: IndexedDB chỉ thực sự xong khi transaction
// fire "oncomplete", nên resolve ở thời điểm của transaction chứ không của request.
function run(mode, body) {
    return openDb().then(db => new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const result = body(tx.objectStore(STORE));
        tx.oncomplete = () => resolve(result);
        tx.onerror = () => reject(tx.error || new Error('Lỗi IndexedDB'));
        tx.onabort = () => reject(tx.error || new Error('Phép ghi vào IndexedDB bị huỷ'));
    }));
}

// Tự bắt sự kiện thay vì thenable của IDBRequest: Safari đời cũ không hỗ trợ .then trên request.
function wait(req) {
    return new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error || new Error('Lỗi IndexedDB'));
    });
}

export function allDecks() {
    return run('readonly', store => wait(store.getAll()).then(rows => rows || []));
}

export function getDeck(fileName) {
    return run('readonly', store => wait(store.get(fileName)).then(row => row || null));
}

export function putDeck(deck) {
    return run('readwrite', store => wait(store.put(deck)));
}

export function putDecks(decks) {
    return run('readwrite', store => {
        for (const deck of decks) store.put(deck);
        return decks.length;
    });
}

export function removeDeck(fileName) {
    return run('readwrite', store => wait(store.delete(fileName)));
}

export function clearDecks() {
    return run('readwrite', store => wait(store.clear()));
}

// Ước lượng chỗ trình duyệt đang dùng, để người dùng thấy bản sao nặng bao nhiêu.
// navigator.storage.estimate chỉ có trên trình duyệt hỗ trợ, nên trả null chứ không đoán.
export async function estimate() {
    if (!navigator.storage || !navigator.storage.estimate) return null;
    try {
        return await navigator.storage.estimate();
    } catch (err) {
        return null;
    }
}
