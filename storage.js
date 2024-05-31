/*
 * __grouplist: a list of { key: number, value: string }
 */

export async function getGroupList() {
    let g = await browser.storage.local.get("__grouplist");

    let id_to_tag = new Map();
    let tag_to_id = new Map();

    if (g["__grouplist"]) {
        let grouplist = g["__grouplist"];
        grouplist.forEach((o) => {
            id_to_tag.set(o.key, o.value);
            tag_to_id.set(o.value, o.key);
        });
    }
    return { id_to_tag, tag_to_id };
};

export async function setGroupList(id_to_tag) {
    let g = [];
    id_to_tag.forEach((v, k, m) => {
        g.push({ key: k, value: v });
    });

    let names = Array.from(id_to_tag.values());
    names.sort();

    await browser.storage.local.set({ __grouplist: g });
    await browser.storage.local.set({ __groupnames: names });
};

/*
 * Group object: array of objects:
 * {
 *      engine: string
 *      prefix: string
 *      suffix: string
 * }
 */

export async function getGroupById(g_id) {
    let g = await browser.storage.local.get(`g_${g_id}`);
    if (g[`g_${g_id}`]) {
        return g[`g_${g_id}`];
    }
    else {
        return null;
    }
}

export async function setGroup(g_id, group) {
    let g = Object.create(null);
    g[`g_${g_id}`] = group;
    await browser.storage.local.set(g);
}

export async function deleteGroup(g_id) {
    let grouplist = await getGroupList();
    grouplist.id_to_tag.delete(g_id);
    await setGroupList(grouplist.id_to_tag);

    await browser.storage.local.remove(`g_${g_id}`);
}
