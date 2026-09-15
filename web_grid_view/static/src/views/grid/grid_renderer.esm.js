import {Component, onMounted, useRef, useState} from "@odoo/owl";
import {useService} from "@web/core/utils/hooks";
import {
    formatFloat,
    formatFloatTime,
    formatInteger,
} from "@web/views/fields/formatters";
import {GridComponent} from "../../components/grid_component.esm";
import {GridRow} from "../../components/grid_row.esm";
import {registry} from "@web/core/registry";

export class GridRenderer extends Component {
    static template = "web_grid_view.GridRenderer";
    static components = {GridComponent};
    static props = {
        model: {type: Object},
        onCellEdit: {type: Function, optional: true},
        onCellCommit: {type: Function, optional: true},
        onCellNavigate: {type: Function, optional: true},
    };

    setup() {
        this.model = this.props.model;
        this.state = useState({
            hoveredRow: null,
            hoveredCol: null,
            editingRow: null,
            editingCol: null,
        });
        this.actionService = useService("action");
        this.gridRef = useRef("grid");
        onMounted(() => this._focusOnToday());
    }

    get hasData() {
        const m = this.model;
        return m.hasSections ? m.sections.length > 0 : m.rows.length > 0;
    }

    get visibleColumns() {
        const cols = this.model.columns || [];
        return cols.filter((c) => !c.isWeekend || this.model.showWeekends);
    }

    get gridTemplateColumns() {
        const n = this.visibleColumns.length;
        const colWidth = n > 7 ? "minmax(6ch, 1fr)" : "minmax(10ch, 1fr)";
        return `minmax(10ch, 250px) repeat(${n}, ${colWidth}) minmax(8ch, 12ch)`;
    }

    get grandTotal() {
        return this.visibleColumns.reduce((sum, col) => sum + (col.grandTotal || 0), 0);
    }

    get maxColumnTotal() {
        return Math.max(1, ...this.visibleColumns.map((c) => c.grandTotal));
    }

    openRecords(rowId, colId) {
        const row = this.model.allRows.find((r) => r.id === rowId);
        if (!row || !row.cells[colId]) return;
        const cell = row.cells[colId];
        this.actionService.doAction({
            type: "ir.actions.act_window",
            name:
                row.label +
                " - " +
                (this.model.columns.find((c) => c.id === colId)?.label || ""),
            res_model: this.model.resModel,
            views: [
                [false, "list"],
                [false, "form"],
            ],
            domain: cell.domain,
        });
    }

    isNegative(value) {
        return value !== undefined && value !== null && Number(value) < 0;
    }

    formatValue(value) {
        if (value === undefined || value === null) {
            return "";
        }
        if (this.getWidget() === "float_time") {
            return formatFloatTime(value);
        }
        if (this.getFieldType() === "integer") {
            return formatInteger(value);
        }
        return formatFloat(value);
    }

    getBarHeight(col) {
        return `${(col.grandTotal / this.maxColumnTotal) * 100}%`;
    }

    _focusOnToday() {
        if (!this.gridRef.el) {
            return;
        }
        const todayCol = this.visibleColumns.find((c) => c.isToday);
        if (todayCol) {
            const cell = this.gridRef.el.querySelector(
                `[data-col-id="${todayCol.id}"]`
            );
            if (cell) {
                cell.scrollIntoView({block: "nearest", inline: "center"});
            }
        }
    }

    onCellMouseOver(rowId, colId) {
        this.state.hoveredRow = rowId;
        this.state.hoveredCol = colId;
    }

    onRowMouseOver(rowId) {
        this.state.hoveredRow = rowId;
        this.state.hoveredCol = null;
    }

    onColumnMouseOver(colId) {
        this.state.hoveredRow = null;
        this.state.hoveredCol = colId;
    }

    onCellMouseOut() {
        this.state.hoveredRow = null;
        this.state.hoveredCol = null;
    }

    onCellClick(rowId, colId) {
        if (!this.model.archInfo?.editable) {
            return;
        }
        if (!this.model.archInfo?.measureField) {
            return;
        }
        this.state.editingRow = rowId;
        this.state.editingCol = colId;
    }

    async onCellCommit(value) {
        const rowId = this.state.editingRow;
        const colId = this.state.editingCol;
        if (rowId !== null && colId !== null) {
            await this.props.onCellCommit?.(rowId, colId, value);
        }
    }

    onCellDiscard() {
        this.state.editingRow = null;
        this.state.editingCol = null;
    }

    onCellNavigate(key, shift) {
        const rowId = this.state.editingRow;
        const colId = this.state.editingCol;
        if (rowId === null || colId === null) {
            return;
        }
        if (key !== "Tab") {
            this.onCellDiscard();
            return;
        }
        const rows = this.model.allRows;
        const cols = this.visibleColumns;
        const rowIdx = rows.findIndex((r) => r.id === rowId);
        const colIdx = cols.findIndex((c) => c.id === colId);
        if (rowIdx === -1 || colIdx === -1) {
            return;
        }
        const linearIdx = rowIdx * cols.length + colIdx;
        const lastLinearIdx = rows.length * cols.length - 1;
        const nextLinearIdx = Math.min(
            Math.max(linearIdx + (shift ? -1 : 1), 0),
            lastLinearIdx
        );
        const nextRow = rows[Math.floor(nextLinearIdx / cols.length)];
        const nextCol = cols[nextLinearIdx % cols.length];
        this.state.editingRow = nextRow.id;
        this.state.editingCol = nextCol.id;
        this.props.onCellNavigate?.(nextRow.id, nextCol.id);
    }

    getCellClass(row, col, rowIndex) {
        return [
            this.isHovered(row.id, col.id) ? "o_grid_cell_highlighted" : "",
            rowIndex % 2 === 0 ? "bg-view" : "bg-100",
            col.isWeekend ? "bg-opacity-50" : "",
            this.model.archInfo?.editable ? "o_grid_cell_editable" : "",
            this.getCell(row, col.id)?.value ? "" : "o_grid_cell_empty",
        ]
            .filter(Boolean)
            .join(" ");
    }

    isHovered(rowId, colId) {
        return this.state.hoveredRow === rowId || this.state.hoveredCol === colId;
    }

    isEditing(rowId, colId) {
        return this.state.editingRow === rowId && this.state.editingCol === colId;
    }

    getCell(row, colId) {
        return row.cells?.[colId] || undefined;
    }

    get measureLabel() {
        return (
            this.model.archInfo?.measureField?.string ||
            this.model.fields?.[this.model.measureFieldName]?.field_description ||
            "Total"
        );
    }

    getFieldType() {
        return this.model.fields?.[this.model.measureFieldName]?.type || "float";
    }

    getWidget() {
        return this.model.archInfo?.measureField?.widget || undefined;
    }

    getRowLabelComponent(row) {
        const fieldName = (row.labelParts || row.parts)?.[0]?.name;
        const fieldType = this.model.fields?.[fieldName]?.type;
        return (
            registry.category("grid_view_row_components").get(fieldType, null)
                ?.component || GridRow
        );
    }
}
