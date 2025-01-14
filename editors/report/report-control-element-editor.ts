/* eslint-disable import/no-extraneous-dependencies */
import { css, html, LitElement, TemplateResult } from 'lit';
import {
  customElement,
  property,
  query,
  queryAll,
  state,
} from 'lit/decorators.js';

import '@material/mwc-button';
import type { Button } from '@material/mwc-button';

import { newEditEvent } from '@openscd/open-scd-core';
import { identity, updateReportControl } from '@openenergytools/scl-lib';

import '../../foundation/components/scl-checkbox.js';
import '../../foundation/components/scl-select.js';
import '../../foundation/components/scl-textfield.js';
import type { SclCheckbox } from '../../foundation/components/scl-checkbox.js';
import type { SclSelect } from '../../foundation/components/scl-select.js';
import type { SclTextfield } from '../../foundation/components/scl-textfield.js';

import { maxLength, patterns } from '../../foundation/pattern.js';
import { updateMaxClients } from './foundation.js';

const optFieldsHelpers: Record<string, string> = {
  seqNum: 'Whether Report includes Sequence Number',
  timeStamp: 'Whether Report includes Time Stamp',
  dataSet: 'Whether Report includes DataSet reference',
  reasonCode: 'Whether Report includes reason for trigger',
  dataRef: 'Whether Report includes structure of DataSet',
  entryID: 'Whether Report includes ID for Report',
  configRef: 'Whether Report includes Configuration Revision',
  bufOvfl: 'Whether Report includes indicator for buffer overflow',
};

const trgOpsHelpers: Record<string, string> = {
  dchg: 'Trigger Report through data change',
  qchg: 'Trigger Report through data quality change',
  dupd: 'Trigger Report through data update',
  period: 'Periodically send Report',
  gi: 'Allow trigger Report manually',
};

function checkRptEnabledValidity(
  rptEnabled: Element | null,
  input: SclTextfield
): boolean {
  if (!input.checkValidity()) return false;

  if (!rptEnabled) return true;

  const clientLNs = Array.from(
    rptEnabled.querySelectorAll(':scope > ClientLN')
  );
  const maxRpt = input.maybeValue ?? '0';

  if (clientLNs.length <= parseInt(maxRpt, 10)) return true;

  input.setCustomValidity(`There are ${clientLNs.length} clientLNs`);
  return false;
}

@customElement('report-control-element-editor')
export class ReportControlElementEditor extends LitElement {
  /** The document being edited as provided to plugins by [[`OpenSCD`]]. */
  @property({ attribute: false })
  doc!: XMLDocument;

  /** The element being edited as provided to plugins by [[`OpenSCD`]]. */
  @property({ attribute: false })
  element!: Element;

  /** SCL change indicator */
  @property({ type: Number })
  editCount = 0;

  @state()
  private optFieldsDiff = false;

  @state()
  private trgOpsDiff = false;

  @state()
  private reportControlDiff = false;

  @queryAll('.content.optfields > scl-checkbox')
  optFieldsInputs!: SclCheckbox[];

  @query('.save.optfields') optFieldsSave!: Button;

  @queryAll('.content.trgops > scl-checkbox')
  trgOpsInputs!: SclCheckbox[];

  @query('.save.trgops') trgOpsSave!: Button;

  @queryAll('.report.attributes')
  reportControlInputs!: (SclTextfield | SclSelect | SclCheckbox)[];

  @query('.content.reportcontrol > .save') reportControlSave!: Button;

  @query('.rptenabled.attributes') rptEnabledInput!: SclTextfield;

  private onOptFieldsInputChange(): void {
    const optFields = this.element.querySelector(':scope > OptFields');

    const optFieldsAttrs: Record<string, string | null> = {};
    for (const input of this.optFieldsInputs)
      optFieldsAttrs[input.label] = input.maybeValue;

    this.optFieldsDiff = Array.from(this.optFieldsInputs).some(
      input => optFields?.getAttribute(input.label) !== input.maybeValue
    );
  }

  private saveOptFieldChanges(): void {
    const optFields = this.element.querySelector(':scope > OptFields');

    if (!optFields) return;

    const optFieldAttrs: Record<string, string | null> = {};
    for (const input of this.optFieldsInputs ?? [])
      if (optFields.getAttribute(input.label) !== input.maybeValue)
        optFieldAttrs[input.label] = input.maybeValue;

    const updateEdit = { element: optFields, attributes: optFieldAttrs };
    this.dispatchEvent(newEditEvent(updateEdit));

    this.onOptFieldsInputChange();
  }

  private onTrgOpsInputChange(): void {
    const trgOps = this.element.querySelector(':scope > TrgOps');

    const trgOpsAttrs: Record<string, string | null> = {};
    for (const input of this.trgOpsInputs)
      trgOpsAttrs[input.label] = input.maybeValue;

    this.trgOpsDiff = Array.from(this.trgOpsInputs).some(
      input => trgOps?.getAttribute(input.label) !== input.maybeValue
    );
  }

  private saveTrgOpsChanges(): void {
    const trgOps = this.element.querySelector(':scope > TrgOps');

    if (!trgOps) return;

    const trgOpsAttrs: Record<string, string | null> = {};
    for (const input of this.trgOpsInputs ?? [])
      if (trgOps.getAttribute(input.label) !== input.maybeValue)
        trgOpsAttrs[input.label] = input.maybeValue;

    const updateEdit = { element: trgOps, attributes: trgOpsAttrs };
    this.dispatchEvent(newEditEvent(updateEdit));

    this.onTrgOpsInputChange();
  }

  private onReportControlInputChange(): void {
    const reportControl = this.element;
    const rptEnabled = reportControl.querySelector(':scope > RptEnabled');

    const someInvalidAttrs = Array.from(this.reportControlInputs).some(
      input => !input.checkValidity()
    );
    if (
      someInvalidAttrs ||
      !checkRptEnabledValidity(rptEnabled, this.rptEnabledInput)
    ) {
      this.reportControlDiff = false;
      return;
    }

    const reportControlAttrs: Record<string, string | null> = {};
    for (const input of this.reportControlInputs)
      reportControlAttrs[input.label] = input.maybeValue;

    const someAttrDiff = Array.from(this.reportControlInputs).some(
      input => reportControl?.getAttribute(input.label) !== input.maybeValue
    );
    const rptEnabledDiff =
      (rptEnabled?.getAttribute('max') ?? null) !==
      this.rptEnabledInput.maybeValue;
    this.reportControlDiff = someAttrDiff || rptEnabledDiff;
  }

  private saveReportControlChanges(): void {
    const reportControl = this.element;

    const reportControlAttrs: Record<string, string | null> = {};
    for (const input of this.reportControlInputs ?? [])
      if (reportControl.getAttribute(input.label) !== input.maybeValue)
        reportControlAttrs[input.label] = input.maybeValue;

    const reportControlActions = updateReportControl({
      element: reportControl,
      attributes: reportControlAttrs,
    });

    const max = this.rptEnabledInput.maybeValue;
    const rptEnabledAction = updateMaxClients(reportControl, max);

    if (!rptEnabledAction)
      this.dispatchEvent(newEditEvent(reportControlActions));
    else
      this.dispatchEvent(
        newEditEvent([...reportControlActions, rptEnabledAction])
      );

    this.onReportControlInputChange();
  }

  private renderOptFieldsContent(): TemplateResult {
    const [
      seqNum,
      timeStamp,
      dataSet,
      reasonCode,
      dataRef,
      entryID,
      configRef,
      bufOvfl,
    ] = [
      'seqNum',
      'timeStamp',
      'dataSet',
      'reasonCode',
      'dataRef',
      'entryID',
      'configRef',
      'bufOvfl',
    ].map(
      attr =>
        this.element.querySelector('OptFields')?.getAttribute(attr) ?? null
    );

    return html`<div class="content optfields">
        <h3>Optional Fields</h3>
        ${Object.entries({
          seqNum,
          timeStamp,
          dataSet,
          reasonCode,
          dataRef,
          entryID,
          configRef,
          bufOvfl,
        }).map(
          ([key, value]) =>
            html`<scl-checkbox
              label="${key}"
              .maybeValue=${value}
              nullable
              helper="${optFieldsHelpers[key]}"
              @input=${this.onOptFieldsInputChange}
            ></scl-checkbox>`
        )}
      </div>
      <mwc-button
        class="save optfields"
        label="save"
        icon="save"
        ?disabled=${!this.optFieldsDiff}
        @click=${() => this.saveOptFieldChanges()}
      ></mwc-button>`;
  }

  private renderTrgOpsContent(): TemplateResult {
    const [dchg, qchg, dupd, period, gi] = [
      'dchg',
      'qchg',
      'dupd',
      'period',
      'gi',
    ].map(
      attr => this.element.querySelector('TrgOps')?.getAttribute(attr) ?? null
    );

    return html`<div class="content trgops">
        <h3>Trigger Options</h3>
        ${Object.entries({ dchg, qchg, dupd, period, gi }).map(
          ([key, value]) =>
            html`<scl-checkbox
              label="${key}"
              .maybeValue=${value}
              nullable
              helper="${trgOpsHelpers[key]}"
              @input=${this.onTrgOpsInputChange}
            ></scl-checkbox>`
        )}
      </div>
      <mwc-button
        class="save trgops"
        label="save"
        icon="save"
        ?disabled=${!this.trgOpsDiff}
        @click=${() => this.saveTrgOpsChanges()}
      ></mwc-button>`;
  }

  private renderChildElements(): TemplateResult {
    return html`<div class="content">
      ${this.renderTrgOpsContent()}${this.renderOptFieldsContent()}
    </div>`;
  }

  private renderReportControlContent(): TemplateResult {
    const [name, desc, buffered, rptID, indexed, bufTime, intgPd] = [
      'name',
      'desc',
      'buffered',
      'rptID',
      'indexed',
      'bufTime',
      'intgPd',
    ].map(attr => this.element?.getAttribute(attr));
    const max =
      this.element.querySelector('RptEnabled')?.getAttribute('max') ?? null;

    return html`<div class="content reportcontrol">
      <scl-textfield
        class="report attributes"
        label="name"
        .maybeValue=${name}
        helper="ReportControl Name"
        required
        pattern="${patterns.asciName}"
        maxLength="${maxLength.cbName}"
        dialogInitialFocus
        @input=${this.onReportControlInputChange}
      ></scl-textfield
      ><scl-textfield
        class="report attributes"
        label="desc"
        .maybeValue=${desc}
        nullable
        helper="ReportControl Description"
        @input=${this.onReportControlInputChange}
      ></scl-textfield
      ><scl-checkbox
        class="report attributes"
        label="buffered"
        .maybeValue=${buffered}
        helper="Whether ReportControl is Buffered"
        @input=${this.onReportControlInputChange}
      ></scl-checkbox
      ><scl-textfield
        class="report attributes"
        label="rptID"
        .maybeValue=${rptID}
        nullable
        helper="ReportControl ID"
        @input=${this.onReportControlInputChange}
      ></scl-textfield
      ><scl-checkbox
        class="report attributes"
        label="indexed"
        .maybeValue=${indexed}
        nullable
        helper="Allow multiple Instances of this ReportControl"
        @input=${this.onReportControlInputChange}
      ></scl-checkbox
      ><scl-textfield
        class="rptenabled attributes"
        label="max Clients"
        .maybeValue=${max}
        helper="Number of ReportControl Instances"
        nullable
        type="number"
        min="0"
        suffix="#"
        @input=${this.onReportControlInputChange}
      ></scl-textfield
      ><scl-textfield
        class="report attributes"
        label="bufTime"
        .maybeValue=${bufTime}
        helper="Minimum time between two ReportControl"
        nullable
        required
        type="number"
        min="0"
        suffix="ms"
        @input=${this.onReportControlInputChange}
      ></scl-textfield
      ><scl-textfield
        class="report attributes"
        label="intgPd"
        .maybeValue=${intgPd}
        helper="Integrity Period"
        nullable
        required
        type="number"
        min="0"
        suffix="ms"
        @input=${this.onReportControlInputChange}
      ></scl-textfield>
      <mwc-button
        class="save"
        label="save"
        icon="save"
        ?disabled=${!this.reportControlDiff}
        @click=${() => this.saveReportControlChanges()}
      ></mwc-button>
    </div>`;
  }

  render(): TemplateResult {
    if (this.element)
      return html`<h2 style="display: flex;">
          <div style="flex:auto">
            <div>ReportControl</div>
            <div class="headersubtitle">${identity(this.element)}</div>
          </div>
        </h2>
        <div class="parentcontent">
          ${this.renderReportControlContent()}${this.renderChildElements()}
        </div>`;

    return html`<div class="parentcontent">
      <h2>No ReportControl loaded</h2>
    </div>`;
  }

  static styles = css`
    .parentcontent {
      display: grid;
      grid-gap: 12px;
      box-sizing: border-box;
      grid-template-columns: repeat(auto-fit, minmax(316px, auto));
    }

    .content {
      display: flex;
      flex-direction: column;
      border-left: thick solid var(--mdc-theme-on-primary);
    }

    .content > * {
      display: block;
      margin: 4px 8px 16px;
    }

    .save {
      align-self: flex-end;
    }

    h2,
    h3 {
      color: var(--mdc-theme-on-surface);
      font-family: 'Roboto', sans-serif;
      font-weight: 300;
      margin: 4px 8px 16px;
      padding-left: 0.3em;
    }

    .headersubtitle {
      font-size: 16px;
      font-weight: 200;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    *[iconTrailing='search'] {
      --mdc-shape-small: 28px;
    }

    @media (max-width: 950px) {
      .parentcontent {
        border-left: 0px solid var(--mdc-theme-on-primary);
      }
    }
  `;
}
