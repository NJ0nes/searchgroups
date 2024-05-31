browser.omnibox.setDefaultSuggestion({
    description: "Type a group keyword and a query"
});

function makeSuggestions(groupnames, text) {
    let splitup = text.split(' ');
    let querytext = splitup.slice(1).join(' ');
    let key = text.split(' ')[0];

    let desctext = querytext == "" ? " " : querytext;

    let suggestions = [];
    groupnames.forEach((name) => {
        if (name.startsWith(key) || text == "") {
            suggestions.push({
                content: `${name} ${querytext}`,
                description: `Search '${desctext}' with ${name}`,
                deletable: true
            });
        }
    });

    return suggestions;
}

browser.omnibox.onInputChanged.addListener(async (text, suggest) => {
    let groupnames = await browser.storage.local.get("__groupnames");
    // It's possible the addon is being used before any groups have been created
    if ("__groupnames" in groupnames) {
        suggest(makeSuggestions(groupnames.__groupnames, text));
    }
});


async function searchWithGroup(search_group, disposition, querytext) {
    let first_tab = true;
    let active_tabs = await browser.tabs.query({
        active: true,
        windowId: browser.windows.WINDOW_ID_CURRENT
    });
    let current_tab = active_tabs[0];
    let parent_tab = current_tab;

    let make_separator = (await browser.storage.local.get("__separatorenable"));
    make_separator = make_separator["__separatorenable"];

    const separator_url = `/separator/index.html?q=${encodeURIComponent(querytext)}`;

    if (make_separator) {
        if (disposition == "currentTab") {
            await browser.tabs.update(current_tab.id, {
                url: separator_url,
            });
        }
        else {
            parent_tab = await browser.tabs.create({
                url: separator_url,
                active: false
            });
        }
    }

    const all_engines = await browser.search.get()
        .then((a) => a.map((x) => x.name))
        .then((a) => new Set(a));

    for (const e of search_group) {
        if (!all_engines.has(e.engine)) { continue; }

        let search_query = querytext;
        if (e.prefix != "") {
            search_query = `${e.prefix} ${search_query}`;
        }
        if (e.suffix != "") {
            search_query = `${search_query} ${e.suffix}`;
        }

        if (first_tab) {
            if (disposition == "currentTab" && !make_separator) {
                browser.search.search({
                    engine: e.engine,
                    query: search_query,
                    disposition: "CURRENT_TAB"
                });
            }
            else if (disposition == "newForegroundTab" || make_separator) {
                let mytab = await browser.tabs.create({
                    active: true,
                    openerTabId: parent_tab.id
                });

                browser.search.search({
                    engine: e.engine,
                    query: search_query,
                    tabId: mytab.id
                });
            }
            
            else if (disposition == "newBackgroundTab") {
                let mytab = await browser.tabs.create({
                    active: false,
                    openerTabId: parent_tab.id
                });

                browser.search.search({
                    engine: e.engine,
                    query: search_query,
                    tabId: mytab.id
                });
            }
        }
        else {
            let create_info = { active: false };
            if (make_separator) {
                create_info.openerTabId = parent_tab.id;
            }
            else {
                if (disposition == "currentTab") {
                    if ("openerTabId" in current_tab) {
                        create_info.openerTabId = current_tab.openerTabId;
                    }
                }
                else {
                    create_info.openerTabId = current_tab.id;
                }
            }
            let mytab = await browser.tabs.create(create_info);

            browser.search.search({
                engine: e.engine,
                query: search_query,
                tabId: mytab.id
            });
        }

        first_tab = false;
    }
}

browser.omnibox.onInputEntered.addListener(async (text, disposition) => {
    let splitup = text.split(' ');
    let querytext = splitup.slice(1).join(' ');
    let key = text.split(' ')[0];

    if (key == text) { return; }

    let storage = await import("/storage.js");
    let groups = await storage.getGroupList();

    if (groups.tag_to_id.has(key)) {
        let search_group = await storage.getGroupById(groups.tag_to_id.get(key));
        await searchWithGroup(search_group, disposition, querytext);
    }
    else {
        let closest_id = null;
        groups.id_to_tag.forEach(async (tag, id, map) => {
            if (tag.startsWith(key)) {
                closest_id = id;
            }
        });

        if (closest_id != null) {
            let search_group = await storage.getGroupById(closest_id);
            await searchWithGroup(search_group, disposition, querytext);   
        }
    }
})
