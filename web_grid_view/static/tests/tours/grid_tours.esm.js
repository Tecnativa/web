/* Copyright 2026 Tecnativa - Juan Carlos Oñate
 * License AGPL-3.0 or later (https://www.gnu.org/licenses/agpl.html). */
import {registry} from "@web/core/registry";

const {DateTime} = luxon;
const tours = registry.category("web_tour.tours");

const weekStart = () => DateTime.now().startOf("week").toISODate();
const weekEnd = () => DateTime.now().endOf("week").toISODate();

tours.add("web_grid_view_add_line", {
    steps: () => [
        {
            content: "There is exactly one Add a Line button, in the toolbar",
            trigger: ".o_grid_toolbar button:contains('Add a Line')",
        },
        {
            content: "No per-row add-line links remain in the grid body",
            trigger: ".o_grid_renderer:not(:has(a:contains('Add a line')))",
        },
        {
            content: "Click it",
            trigger: ".o_grid_toolbar button:contains('Add a Line')",
            run: "click",
        },
        {
            content: "The create dialog opens with the form view of the action",
            trigger: ".modal .o_form_view:not(:has([name='model_id'])) [name='name']",
        },
        {
            content: "The context of the action provides the default values",
            trigger: ".modal [name='interval_number'] input:value(7)",
        },
        {
            content: "Discard it, no need to fill the form for this check",
            trigger: ".modal button.btn-close, .modal button:contains('Discard')",
            run: "click",
        },
    ],
});

tours.add("web_grid_view_add_line_hidden", {
    steps: () => [
        {
            content: 'With create="false" on the arch, the button is not shown',
            trigger: ".o_grid_toolbar:not(:has(button:contains('Add a Line')))",
        },
    ],
});

tours.add("web_grid_view_tab_wraps_row", {
    steps: () => [
        {
            content: "Click the last column of the 'days' row, without typing",
            trigger: `.o_grid_cell[data-row-id="code||days"][data-col-id="${weekEnd()}"]`,
            run: "click",
        },
        {
            content: "Press Tab without editing the cell",
            trigger: ".o_grid_cell_input",
            run: "press Tab",
        },
        {
            content: "The first column of the 'hours' row is now being edited",
            trigger: `.o_grid_cell[data-row-id="code||hours"][data-col-id="${weekStart()}"] .o_grid_cell_input`,
        },
    ],
});

tours.add("web_grid_view_hover", {
    steps: () => [
        {
            content: "Hover a data cell",
            trigger: `.o_grid_cell[data-row-id="code||days"][data-col-id="${weekStart()}"]`,
            run: "hover",
        },
        {
            content: "Its own row title is highlighted",
            trigger:
                '.o_grid_row_title[data-row-id="code||days"].o_grid_cell_highlighted',
        },
        {
            content: "Hovering another row title highlights that row instead",
            trigger: '.o_grid_row_title[data-row-id="code||hours"]',
            run: "hover",
        },
        {
            content: "Its cells are highlighted and the previous row is not",
            trigger: `.o_grid_cell[data-row-id="code||hours"][data-col-id="${weekStart()}"].o_grid_cell_highlighted`,
        },
        {
            content: "The first row is no longer highlighted",
            trigger:
                '.o_grid_row_title[data-row-id="code||days"]:not(.o_grid_cell_highlighted)',
        },
        {
            content: "Editable cells are marked so the pointer outlines them",
            trigger: `.o_grid_cell[data-row-id="code||days"][data-col-id="${weekStart()}"].o_grid_cell_editable`,
        },
        {
            content: "A cell with no value is marked as empty, to fade its zero",
            trigger: `.o_grid_cell[data-row-id="code||hours"][data-col-id="${weekEnd()}"].o_grid_cell_empty`,
        },
    ],
});

tours.add("web_grid_view_empty_row_label", {
    steps: () => [
        {
            content: "An empty row value is left out of the label",
            trigger: ".o_grid_row_title:contains('Days'):not(:contains('false'))",
        },
    ],
});

tours.add("web_grid_view_scroll", {
    steps: () => [
        {
            content: "The grid is rendered with all its rows",
            trigger: ".o_grid_renderer .o_grid_grid",
        },
        {
            content: "The renderer scrolls vertically and keeps its header in place",
            trigger: ".o_grid_renderer",
            run() {
                const grid = document.querySelector(".o_grid_renderer");
                const styles = getComputedStyle(grid);
                if (styles.overflowY === "hidden" || styles.overflowX === "hidden") {
                    throw new Error(`The grid does not scroll: ${styles.overflow}`);
                }
                if (grid.scrollHeight <= grid.clientHeight) {
                    throw new Error("The rows are not taller than the grid");
                }
                grid.scrollTop = grid.scrollHeight;
                if (!grid.scrollTop) {
                    throw new Error("The grid did not scroll down");
                }
                const top = grid.getBoundingClientRect().top;
                const header = document.querySelector(".o_grid_sticky_corner");
                if (header.getBoundingClientRect().top < top - 1) {
                    throw new Error("The header scrolled away with the rows");
                }
                const totals = document.querySelector(".o_grid_sticky_bottom");
                if (
                    totals.getBoundingClientRect().bottom >
                    grid.getBoundingClientRect().bottom + 1
                ) {
                    throw new Error("The totals row is not kept at the bottom");
                }
                grid.scrollLeft = grid.scrollWidth;
                const rowTitle = document.querySelector(".o_grid_row_title");
                if (
                    rowTitle.getBoundingClientRect().left <
                    grid.getBoundingClientRect().left - 1
                ) {
                    throw new Error("The row titles scrolled away with the columns");
                }
            },
        },
    ],
});

tours.add("web_grid_view_keep_period", {
    steps: () => {
        const lastWeek = DateTime.now().startOf("week").minus({weeks: 1}).toISODate();
        return [
            {
                content: "Go to the previous week",
                trigger: ".o_grid_toolbar .fa-chevron-left",
                run: "click",
            },
            {
                content: "The grid shows the previous week",
                trigger: `.o_grid_renderer .o_grid_column_title[data-col-id="${lastWeek}"]`,
            },
            {
                content: "Open the records of that cell with the magnifier",
                trigger: `.o_grid_cell[data-col-id="${lastWeek}"]`,
                run() {
                    this.anchor.querySelector(".o_grid_magnifier").click();
                },
            },
            {
                content: "The list of that cell is open",
                trigger: ".o_list_view",
            },
            {
                content: "Go back to the grid",
                trigger: ".o_breadcrumb .o_back_button, .breadcrumb-item:first-child a",
                run: "click",
            },
            {
                content: "The grid is still on the previous week",
                trigger: `.o_grid_renderer .o_grid_column_title[data-col-id="${lastWeek}"]`,
            },
        ];
    },
});

tours.add("web_grid_view_empty_period", {
    steps: () => {
        const lastWeek = DateTime.now().startOf("week").minus({weeks: 1}).toISODate();
        return [
            {
                content: "Go to a period without records",
                trigger: ".o_grid_toolbar .fa-chevron-left",
                run: "click",
            },
            {
                content: "The columns of that period are still shown",
                trigger: `.o_grid_renderer .o_grid_column_title[data-col-id="${lastWeek}"]`,
            },
            {
                content: "The grid says there is nothing yet",
                trigger: ".o_grid_renderer .o_grid_no_data",
            },
            {
                content: "Lines can still be added",
                trigger: ".o_grid_toolbar button:contains('Add a Line')",
            },
        ];
    },
});
