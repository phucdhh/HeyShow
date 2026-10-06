// Phân cấp tài khoản và hạn mức.
//
// Từ thấp tới cao: user (10 bài) -> designer (20) -> master (50) -> admin (không giới hạn).
// "Bài trình chiếu" được tính là số tên file khác nhau mà tài khoản sở hữu (nháp hoặc đã
// publish), vì một bài có thể vừa có nháp vừa có bản publish.

const ROLE_ORDER = ['user', 'designer', 'master', 'admin'];

const ROLE_CAPS = {
    user: { label: 'User', maxPresentations: 10 },
    designer: { label: 'Designer', maxPresentations: 20 },
    master: { label: 'Master', maxPresentations: 50 },
    admin: { label: 'Admin', maxPresentations: Infinity }
};

function normalizeRole(role) {
    return ROLE_CAPS[role] ? role : 'user';
}

function rankOf(role) {
    const index = ROLE_ORDER.indexOf(normalizeRole(role));
    return index === -1 ? 0 : index;
}

function isAdmin(role) {
    return normalizeRole(role) === 'admin';
}

function maxPresentations(role) {
    return ROLE_CAPS[normalizeRole(role)].maxPresentations;
}

function roleNames() {
    return ROLE_ORDER.slice();
}

// admin không bị giới hạn nên không bao giờ bị chặn
function canAddPresentation(currentCount, role) {
    const max = maxPresentations(role);
    return !Number.isFinite(max) || currentCount < max;
}

function limitMessage(role, max) {
    const label = ROLE_CAPS[normalizeRole(role)].label;
    return `Tài khoản ${label} chỉ tạo được tối đa ${max} bài trình chiếu. Hãy xóa bớt bài cũ hoặc liên hệ quản trị để nâng quyền.`;
}

module.exports = {
    ROLE_ORDER,
    ROLE_CAPS,
    normalizeRole,
    rankOf,
    isAdmin,
    maxPresentations,
    roleNames,
    canAddPresentation,
    limitMessage
};
