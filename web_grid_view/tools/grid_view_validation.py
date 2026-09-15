# Copyright 2026 Domatix
# License AGPL-3.0 or later (https://www.gnu.org/licenses/agpl).

import logging
import os

from lxml import etree

from odoo import tools
from odoo.tools import view_validation

_logger = logging.getLogger(__name__)

_grid_validator = None


def _get_grid_validator():
    global _grid_validator  # pylint: disable=global-statement
    if _grid_validator is None:
        with tools.file_open(
            os.path.join("web_grid_view", "views", "grid_view.rng")
        ) as rng_file:
            _grid_validator = etree.RelaxNG(etree.parse(rng_file))
    return _grid_validator


@view_validation.validate("grid_view")
def schema_grid_view(arch, **kwargs):
    """Validate grid view arch against the RNG schema."""
    validator = _get_grid_validator()
    if validator.validate(arch):
        return True
    for error in validator.error_log:
        _logger.error(tools.ustr(error))
    return False


@view_validation.validate("grid_view")
def valid_field_types(arch, **kwargs):
    """Check field type constraints in grid view arch."""
    col_count = measure_count = readonly_count = 0
    for el in arch.xpath("//field"):
        ftype = el.get("type", "")
        if ftype == "col":
            col_count += 1
        elif ftype == "measure":
            measure_count += 1
        elif ftype == "readonly":
            readonly_count += 1
    errors = []
    if col_count != 1:
        errors.append('Grid view must have exactly one <field type="col">')
    if measure_count != 1:
        errors.append('Grid view must have exactly one <field type="measure">')
    if readonly_count > 1:
        errors.append('Grid view must have at most one <field type="readonly">')
    for error in errors:
        _logger.error(error)
    return not errors
