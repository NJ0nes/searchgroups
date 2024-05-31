function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
    .replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0, 
            v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function uuidIsValid(uuid) {
    return uuid.match("^[0-9a-f]{8}-[0-9a-f]{4}-[4][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$") !== null;
}

function makeGroupID() {
    return uuidv4();
}

function switchToCreateGroup() {
    let engine_objects = document.querySelectorAll("input[type='checkbox'][id^='engine']");

    engine_objects.forEach((e) => {
        e.checked = false;
        let ename = e.id.substring(0, e.id.indexOf("_"));
        document.getElementById(`${ename}_name`).value = "";
        document.getElementById(`${ename}_pre`).value = "";
        document.getElementById(`${ename}_suf`).value = "";
    });
    document.getElementById("groupname").value = "";
    document.getElementById("delete-btn").style = "display: none;";
    document.getElementById("update-btn").textContent = "Create Group";
}

let addEngines = async () => {
    let engines = await browser.search.get();

    engines.sort((a, b) => {
        const nameA = a.name.toUpperCase();
        const nameB = b.name.toUpperCase();
        if (nameA < nameB) {
            return -1;
        }
        if (nameA > nameB) {
            return 1;
        }

        return 0;
    });

    let enginelist = document.getElementById("enginelist");

    for (let i = 0; i < engines.length; i++) {
        const e = engines[i];
        let row = document.createElement("tr");
        row.setAttribute("engine", e.name);
        row.id = `engine${i}_row`;
        let check_col = document.createElement("td");
        let name_col = document.createElement("td");
        name_col.id = `engine${i}_name`;
        let prefix_col = document.createElement("td");
        let suffix_col = document.createElement("td");

        check = document.createElement("input");
        check.type = "checkbox";
        check.id = `engine${i}_check`;

        check_col.appendChild(check);

        labeltext = document.createTextNode(e.name);
        name_col.appendChild(labeltext);

        prefix_text = document.createElement("input");
        prefix_text.type = "text";
        prefix_text.id = `engine${i}_pre`;
        prefix_text.classList.add("prefix_text");
        prefix_col.appendChild(prefix_text);

        suffix_text = document.createElement("input");
        suffix_text.type = "text";
        suffix_text.id = `engine${i}_suf`;
        suffix_text.classList.add("suffix_text");
        suffix_col.appendChild(suffix_text);

        row.appendChild(check_col);
        row.appendChild(name_col);
        row.appendChild(prefix_col);
        row.appendChild(suffix_col);
        enginelist.appendChild(row);
    }
};

let addGroups = async () => {
    let storage = await import("/storage.js");
    let groups = await storage.getGroupList();

    let groupnames = Array.from(groups.id_to_tag.values());

    if (groupnames.length == 0) { return; }
    groupnames.sort((a, b) => {
        const nameA = a.toUpperCase();
        const nameB = b.toUpperCase();
        if (nameA < nameB) {
            return -1;
        }
        if (nameA > nameB) {
            return 1;
        }

        return 0;
    });

    let groupselect = document.getElementById("groupselect");
    groupnames.forEach((g) => {
        let myopt = document.createElement("option");
        myopt.value = `${groups.tag_to_id.get(g)}`;
        let t = document.createTextNode(g);
        myopt.appendChild(t);
        groupselect.appendChild(myopt);
    });
};

let loadSeparatorSetting = async () => {
    let pref = await browser.storage.local.get("__separatorenable");
    let check = document.getElementById("separatorenable");
    if ("__separatorenable" in pref) {
        if (pref["__separatorenable"]) {
            check.checked = true;
        }
    }
    else {
        await browser.storage.local.set({ __separatorenable: true });
        check.checked = true;
    }
}

let updateGroup = async (event) => {
    let storage = await import("/storage.js");
    let groupname = document.getElementById("groupname");
    let groupselect = document.getElementById("groupselect");

    let engines = [];

    let engine_objects = document.querySelectorAll("input[type='checkbox'][id^='engine']");
    engine_objects.forEach((e) => {
        if (e.checked) {
            let ename = e.id.substring(0, e.id.indexOf("_"));
            engines.push(ename);
        }
    });

    let group_items = [];
    engines.forEach((e) => {
        let engine_name = document.getElementById(`${e}_row`).getAttribute("engine");
        let engine_prefix = document.getElementById(`${e}_pre`).value;
        let engine_suffix = document.getElementById(`${e}_suf`).value;

        group_items.push({
            engine: engine_name,
            prefix: engine_prefix,
            suffix: engine_suffix
        });
    });

    let groups = await storage.getGroupList();
    let gname = groupname.value;

    if (!gname.includes(" ") && gname != "") {
        /* Create a new search group */
        if (groupselect.value == "__blank") {
            if (!groups.tag_to_id.has(gname)) {
                let newID = makeGroupID();
                let sto1 = storage.setGroup(newID, group_items);

                groups.tag_to_id.set(gname, newID);
                groups.id_to_tag.set(newID, gname);

                let sto2 = storage.setGroupList(groups.id_to_tag);

                let myopt = document.createElement("option");
                myopt.value = newID;
                let t = document.createTextNode(gname);
                myopt.appendChild(t);
                groupselect.appendChild(myopt);

                groupselect.value = newID;

                document.getElementById("delete-btn").style = "";
                document.getElementById("update-btn").textContent = "Update Group";

                await sto1;
                await sto2;
            }
        }
        /* Update an existing search group */
        else {
            let selectedID = groupselect.value;

            let sto1 = storage.setGroup(selectedID, group_items);

            groups.id_to_tag.set(selectedID, gname);
            let sto2 = storage.setGroupList(groups.id_to_tag);

            let opt = document.querySelector(`option[value="${selectedID}"]`);
            opt.textContent = gname;

            await sto1;
            await sto2;
        }
    }
};

let deleteGroup = async (event) => {
    let storage = await import("/storage.js");
    let groupname = document.getElementById("groupname");
    let groupselect = document.getElementById("groupselect");

    if (groupselect.value == "__blank") { return; }
    await storage.deleteGroup(groupselect.value);

    let opt = document.querySelector(`option[value="${groupselect.value}"]`);
    opt.remove();

    groupselect.value = "__blank";
    groupname.value = "";

    switchToCreateGroup();
}

let changeGroup = async (event) => {
    let storage = await import("/storage.js");
    let engine_objects = document.querySelectorAll("input[type='checkbox'][id^='engine']");

    if (event.target.value == "__blank") {
        switchToCreateGroup();
    }
    else {
        let group_engines = await storage.getGroupById(event.target.value);
        let engines = new Map();

        group_engines.forEach((e) => {
            engines.set(e.engine, e);
        });

        engine_objects.forEach((e) => {
            let ename = e.id.substring(0, e.id.indexOf("_"));
            let row_elem = document.getElementById(`${ename}_row`);
            let name_elem = document.getElementById(`${ename}_name`);
            let prefix_elem = document.getElementById(`${ename}_pre`);
            let suffix_elem = document.getElementById(`${ename}_suf`);

            if (engines.has(row_elem.getAttribute("engine"))) {
                e.checked = true;
                prefix_elem.value = engines.get(name_elem.textContent).prefix;
                suffix_elem.value = engines.get(name_elem.textContent).suffix;
            }
            else {
                e.checked = false;
                prefix_elem.value = "";
                suffix_elem.value = "";
            }
        });

        let opt = document.querySelector(`option[value="${event.target.value}"]`);
        document.getElementById("groupname").value = opt.textContent;

        document.getElementById("delete-btn").style = "";
        document.getElementById("update-btn").textContent = "Update Group";
    }
};

let filterEngines = (event) => {
    let rows = document.querySelectorAll("tr");
    rows.forEach((r) => {
        r.setAttribute("style", "");
    });

    if (event.target.value != "") {
        let q = event.target.value;
        let hidden_rows = document.querySelectorAll(`tbody > tr:not([engine^=${q} i])`);

        hidden_rows.forEach((r) => {
            r.setAttribute("style", "display: none;");
        })
    }
}

addEventListener("load", async (ev) => {
    await addEngines();
    await addGroups();
    await loadSeparatorSetting();
});

document.getElementById("update-btn").addEventListener("click", updateGroup);
document.getElementById("delete-btn").addEventListener("click", deleteGroup);
document.getElementById("groupselect").addEventListener("change", changeGroup);
document.getElementById("filter").addEventListener("input", filterEngines);

let separatorenable = document.getElementById("separatorenable");
separatorenable.addEventListener("change", async () => {
    await browser.storage.local.set({
        __separatorenable: separatorenable.checked
    });
})

function sanitizeImport(imported) {
    let cleaned = {
        __grouplist: [],
        __groupnames: [],
        __separatorenable: true
    };

    if (!("__grouplist" in imported)) { return cleaned; }
    if (!Array.isArray(imported.__grouplist)) { return cleaned; }

    for (i = 0; i < imported.__grouplist.length; i++) {
        const g = imported.__grouplist[i];
        // Only import groups with valid keys
        if (!("key" in g)) { continue; }
        if (!(typeof g.key === "string" && uuidIsValid(g.key))) { continue; }

        // Only import groups that exist
        if (!(`g_${g.key}` in imported)) { continue; }
        const imported_group = imported[`g_${g.key}`];
        if (!Array.isArray(imported_group)) { continue; }

        let cleaned_group = [];
        // Only import valid engines
        for (const e of imported_group) {
            if (!("engine" in e && typeof e.engine === "string")) { continue; }

            let cleaned_engine = {
                engine: e.engine,
                prefix: "",
                suffix: ""
            };

            if ("prefix" in e && typeof e.prefix === "string") {
                cleaned_engine.prefix = e.prefix;
            }
            if ("suffix" in e && typeof e.suffix === "string") {
                cleaned_engine.suffix = e.suffix;
            }

            cleaned_group.push(cleaned_engine);
        }
        cleaned[`g_${g.key}`] = cleaned_group;

        let cleaned_grouplist_entry = {
            key: g.key,
            value: `group${i}`
        };

        if ("value" in g && typeof g.value === "string") {
            cleaned_grouplist_entry.value = g.value;
        }
        cleaned.__grouplist.push(cleaned_grouplist_entry);
    }

    for (g of cleaned.__grouplist) {
        cleaned.__groupnames.push(g.value);
    }
    cleaned.__groupnames.sort();

    if ("__separatorenable" in imported) {
        cleaned.__separatorenable = imported.__separatorenable;
    }

    return cleaned;
}

document.getElementById("import").addEventListener("click", async (event) => {
    let e = document.createElement("input");
    e.setAttribute("type", "file");
    e.setAttribute("accept", ".json,application/json")
    e.value = "";
    e.addEventListener("change", async () => {
        const [file] = e.files;

        if (file) {
            let loaded = await file.text();

            try {
                let obj = JSON.parse(loaded);
                let cleaned = sanitizeImport(obj);

                await browser.storage.local.set(cleaned);

                // Checkboxes stay checked/unchecked after refresh, so set
                // the separator enable box
                let check = document.getElementById("separatorenable");
                check.checked = cleaned.__separatorenable;
                window.location.reload();
            }
            catch (SyntaxError) {}
        }
    });

    e.click();
})

document.getElementById("export").addEventListener("click", async (event) => {
    let saved_settings = await browser.storage.local.get(null);
    let stringified = JSON.stringify(saved_settings);
    let encoded = encodeURIComponent(stringified);

    var e = document.createElement("a");
    e.setAttribute("href", "data:application/json;charset=utf-8," + encoded);
    e.setAttribute("download", "searchgroups_settings.json");

    e.click();
})
