const { getFilteredRowModel, createRow, createTable, createColumnHelper, getCoreRowModel, getPaginationRowModel, FilterFn } = TableCore;
const { rankItem } = MatchSorterUtils;

function fuzzyFind(row, columnId, value, addMeta) {
    const itemRank = rankItem(row.getValue(columnId), value);
    addMeta({ itemRank });
    return itemRank.passed
}

function hashStr(str) {
    var hash = 0,
        i, chr;
    if (str.length === 0) return hash;
    for (i = 0; i < str.length; i++) {
        chr = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
}

function colourFromHash(str) {
    var hash = hashStr(str);
    var r = (hash & 0xFF0000) >> 16;
    var g = (hash & 0x00FF00) >> 8;
    var b = hash & 0x0000FF;
    return `rgb(${r}, ${g}, ${b})`;
}


function createVanillaTable(options) {
    const resolvedOptions = Object.assign({ state: {}, onStateChange: () => { }, renderFallbackValue: null }, options);
    const table = createTable(resolvedOptions);
    const state = table.initialState;
    table.setOptions((prev) =>
        Object.assign(Object.assign(Object.assign({}, prev), options), {
            state: Object.assign(Object.assign({}, state), options.state),
            onStateChange: (updater) => {
                var _a;
                if (typeof updater === "function") {
                    table.options.state = updater(table.getState());
                } else {
                    table.options.state = updater;
                }
                (_a = options.onStateChange) === null || _a === void 0 ? void 0 : _a.call(options, updater);
            },

        })
    );
    return table;
}

const flexRender = (comp, props) => {
    if (typeof comp === "function") {
        return comp(props);
    }
    return comp;
};

function renderTable(tableContainer, table) {
    const tableElement = document.createElement("table");
    tableElement.style.width = "100%";
    const theadElement = document.createElement("thead");
    const tbodyElement = document.createElement("tbody");
    tableElement.appendChild(theadElement);
    tableElement.appendChild(tbodyElement);
    table.getHeaderGroups().forEach((headerGroup) => {
        const tr = document.createElement("tr");
        headerGroup.headers.forEach((header) => {
            const th = document.createElement("th");
            th.innerHTML = header.isPlaceholder ? "" : flexRender(header.column.columnDef.header, header.getContext());
            tr.appendChild(th);
        });
        theadElement.appendChild(tr);
    });

    table.getRowModel().rows.forEach((row) => {
        const tr = document.createElement("tr");

        const logAge = new Date(row.original.created).getTime();
        tr.setAttribute("data-log-age", logAge);

        function lifeValidator() {
            const refreshInterval = setInterval(() => {
                let logAge = +this.parentElement.getAttribute('data-log-age')
                let now = new Date().getTime()

                let difference = now - logAge

                let min = Math.max(1, Math.min(difference, 2000))
                let normalisedValue = min / 2000
                let color = normalisedValue * 255
                this.parentElement.style.backgroundColor = `rgba(255, 255, ${Math.floor(color)})`
                if (color === 255) {
                    clearInterval(refreshInterval)
                }
            }, 100)
        }
        const newImg = document.createElement('img')
        newImg.src = ''
        newImg.onerror = lifeValidator

        row.getVisibleCells().forEach((cell) => {
            const td = document.createElement("td");

            let value = ''
            if (cell.column.id === 'session') {
                value = `<div style="display: flex; flex-direction: row;"><div style="width: 2rem; height: 2rem; border-radius:100%;background-color: ${colourFromHash(cell.getValue())};"></div></div>`
            } else if (['created', 'submitted_on'].includes(cell.column.id)) {
                value = new Date(cell.getValue()).toLocaleString()
            } else if (cell.column.id === 'level') {
                value = `<span style="color: ${cell.getValue() === 'error' ? 'red' : 'black'}">${cell.getValue()}</span>`
            } else if (cell.column.id === 'detail') {
                value = cell.getValue().length > 50 ? cell.getValue().slice(0, 50) + '...' : cell.getValue()
                td.style.cursor = 'pointer'
                td.onclick = () => {
                    const detailsVerbose = document.getElementById('details-verbose')
                    detailsVerbose.innerHTML = cell.getValue()
                    window.scrollTo(0, document.body.scrollHeight);
                }
            } else {
                value = flexRender(cell.column.columnDef.cell, cell.getContext())
            }

            td.setAttribute("data-value", cell.getValue());
            td.innerHTML = value;

            if (!td.onclick) {
                td.style.cursor = 'copy'
                td.onclick = () => {
                    const filterVal = `${cell.column.id}: ${value}`
                    const filterContainer = document.getElementById('filter-container')
                    let filterExists = false
                    Array.from(filterContainer.children).forEach(filter => {
                        if (filter.innerHTML === filterVal) {
                            filterExists = true
                        }
                    })
                    if (filterExists) {
                        return
                    }

                    table.setState((state) => {
                        return {
                            ...state,
                            columnFilters: [
                                {
                                    id: cell.column.id,
                                    value: cell.getValue(),
                                },
                                ...state.columnFilters,
                            ],
                        };
                    });
                    const newFilter = document.createElement('div')
                    newFilter.innerHTML = filterVal
                    newFilter.onclick = () => {
                        table.setState((state) => {
                            return {
                                ...state,
                                columnFilters: state.columnFilters.filter((filter) => filter.id !== cell.column.id),
                            };
                        });
                        newFilter.remove()
                    }
                    newFilter.classList.add('filter')
                    filterContainer.appendChild(newFilter)

                }
            }


            tr.appendChild(td);
        });

        tr.appendChild(newImg)
        tbodyElement.appendChild(tr);
    });
    const paginationElement = document.createElement("div");
    paginationElement.style = "display: flex; justify-content: space-between; align-items: center; padding: 10px;";
    const emptyDiv = document.createElement("div");
    paginationElement.appendChild(emptyDiv);

    const pageControls = document.createElement("div");
    pageControls.style = "display: flex; flex-direction: row; justify-content: space-between; align-items: center; gap: 20px;";
    const prevButton = document.createElement("button");
    prevButton.innerHTML = "Previous";
    prevButton.style.marginRight = "10px";
    prevButton.disabled = !table.getCanPreviousPage();
    prevButton.onclick = () => {
        table.previousPage();
    };
    pageControls.appendChild(prevButton);

    const pageInfo = document.createElement("span");
    pageInfo.innerHTML = `Page ${table.getState().pagination.pageIndex + 1} of ${Math.ceil(table.options.data.length / table.getState().pagination.pageSize)}`;
    pageControls.appendChild(pageInfo);

    const nextButton = document.createElement("button");
    nextButton.innerHTML = "Next";
    nextButton.style.marginLeft = "10px";
    nextButton.disabled = !table.getCanNextPage();
    nextButton.onclick = async () => {
        table.nextPage();
    };
    pageControls.appendChild(nextButton);
    paginationElement.appendChild(pageControls);


    const pageSizeSelect = document.createElement("select");
    const pageSizeOptions = [5, 10, 20, 30, 40, 50];
    pageSizeOptions.forEach((pageSize) => {
        const pageSizeOption = document.createElement("option");
        pageSizeOption.selected = table.getState().pagination.pageSize === pageSize;
        pageSizeOption.value = pageSize.toString();
        pageSizeOption.textContent = `Show ${pageSize}`;
        pageSizeSelect.appendChild(pageSizeOption);
    });
    pageSizeSelect.onchange = (event) => {
        const newPageSize = Number(event.target.value);
        table.setPageSize(newPageSize);
    };
    paginationElement.appendChild(pageSizeSelect);

    tableContainer.innerHTML = "";
    tableContainer.appendChild(tableElement);
    tableContainer.appendChild(paginationElement);
}

(async () => {
    const columnHelper = createColumnHelper();

    const columns = [
        columnHelper.accessor("collectionId", {
            cell: (props) => props.getValue(),
            header: "Collection ID",
        }),
        columnHelper.accessor("collectionName", {
            cell: (props) => props.getValue(),
            header: "Collection Name",
        }),
        columnHelper.accessor("created", {
            cell: (props) => props.getValue(),
            header: "Created",
        }),
        columnHelper.accessor("updated", {
            cell: (props) => props.getValue(),
            header: "Updated",
        }),
        columnHelper.accessor("title", {
            cell: (props) => props.getValue(),
            header: "Title",
        }),
        columnHelper.accessor("detail", {
            cell: (props) => props.getValue(),
            header: "Detail",
        }),
        columnHelper.accessor("channel", {
            cell: (props) => props.getValue(),
            header: "Channel",
        }),
        columnHelper.accessor("level", {
            cell: (props) => props.getValue(),
            header: "Level",
        }),
        columnHelper.accessor("submitted_on", {
            cell: (props) => props.getValue(),
            header: "Submitted On",
        }),
        columnHelper.accessor("session", {
            cell: (props) => props.getValue(),
            header: "Session",
        }),
        columnHelper.accessor("session_inc", {
            cell: (props) => props.getValue(),
            header: "Session Inc",
        }),
        columnHelper.accessor("identifier", {
            cell: (props) => props.getValue(),
            header: "Identifier",
        }),
        columnHelper.accessor("thread", {
            cell: (props) => props.getValue(),
            header: "Thread",
        }),
        columnHelper.accessor("host", {
            cell: (props) => props.getValue(),
            header: "Host",
        }),
        columnHelper.accessor("tenant", {
            cell: (props) => props.getValue(),
            header: "Tenant",
        }),
        columnHelper.accessor("source", {
            cell: (props) => props.getValue(),
            header: "Source",
        }),
    ];

    const host = document.getElementById('pb-host').innerText
    const pb = new PocketBase(host);

    const params = new Proxy(new URLSearchParams(window.location.search), {
        get: (searchParams, prop) => searchParams.get(prop),
      });

    let pageSize = 50;
    let rowOffset = 0;
    const fiveDaysAgo = new Date(new Date().getTime() - 5 * 24 * 60 * 60 * 1000).toISOString()
    const result = await pb.collection("log").getList(rowOffset + 1, pageSize, {
        filter: `submitted_on > "${fiveDaysAgo.replace('T', ' ')}" ${params?.host ? `&& host = "${params.host}"` : ''}`,
        sort: "-submitted_on",
    });

    let data = [...result.items];

    pb.collection("log").subscribe(
        "*",
        function (e) {
            if (e.action === "create") {
                if (params?.host && e.record.host !== params.host) {
                    return
                }
                table.options.data = [e.record, ...table.options.data];
                table.setState((state) => {
                    return {
                        ...state,

                    };
                });
            }
        },
        {
            /* other options like expand, custom headers, etc. */
        }
    );

    const tableContainer = document.getElementById("table-container");
    let constructionOptions = {

        globalFilter: fuzzyFind,
        data: data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(), // needed for client-side filtering
        getPaginationRowModel: getPaginationRowModel(),
        initialState: {
            globalFilter: '',
            columnVisibility: {},
            columnFilters: [],
            pagination: {
                pageSize,
            },
        },

        paginateExpandedRows: true,

        onStateChange: (state) => {
            renderTable(tableContainer, table);
            return state;
        },

    }

    for (let column of columns) {
        if (['collectionId', 'collectionName', 'updated', 'session_inc', 'tenant'].includes(column.accessorKey)) {
            constructionOptions.initialState.columnVisibility[column.accessorKey] = false
        } else {
            constructionOptions.initialState.columnVisibility[column.accessorKey] = true
        }
    }
    const table = createVanillaTable(constructionOptions);

    renderTable(tableContainer, table);
    document.getElementById("global-filter").onchange = e => {
        table.setState((state) => {
            return {
                ...state,
                globalFilter: String(e.target.value)
            }
        })
    }
})();