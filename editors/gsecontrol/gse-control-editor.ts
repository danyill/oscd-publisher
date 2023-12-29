/* eslint-disable import/no-extraneous-dependencies */
import { css, html, LitElement, TemplateResult } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';

import '@material/mwc-button';
import '@material/mwc-icon-button';
import '@material/mwc-dialog';
import '@material/mwc-list/mwc-list-item';
import type { Button } from '@material/mwc-button';
import type { IconButton } from '@material/mwc-icon-button';
import type { Dialog } from '@material/mwc-dialog';
import type { ListItem } from '@material/mwc-list/mwc-list-item';
import { ListItemBase } from '@material/mwc-list/mwc-list-item-base.js';

import { newEditEvent } from '@openscd/open-scd-core';
import {
  createDataSet,
  createGSEControl,
  find,
  findControlBlockSubscription,
  identity,
  removeControlBlock,
} from '@openenergytools/scl-lib';

import '../dataset/data-set-element-editor.js';
import './gse-control-element-editor.js';
import '../../foundation/components/action-filtered-list.js';
import type { ActionFilteredList } from '../../foundation/components/action-filtered-list.js';

import { styles, updateElementReference } from '../../foundation.js';
import { gooseIcon } from '../../foundation/icons.js';

@customElement('gse-control-editor')
export class GseControlEditor extends LitElement {
  /** The document being edited as provided to plugins by [[`OpenSCD`]]. */
  @property({ attribute: false })
  doc!: XMLDocument;

  /** SCL change indicator */
  @property({ type: Number })
  editCount = -1;

  @state()
  selectedGseControl?: Element;

  @state()
  selectedDataSet?: Element | null;

  @query('.selectionlist') selectionList!: ActionFilteredList;

  @query('mwc-button') selectGSEControlButton!: Button;

  @query('mwc-dialog') selectDataSetDialog!: Dialog;

  @query('.new.dataset') newDataSet!: IconButton;

  @query('.change.dataset') changeDataSet!: IconButton;

  /** Resets selected GOOSE and its DataSet, if not existing in new doc */
  update(props: Map<string | number | symbol, unknown>): void {
    super.update(props);

    if (props.has('doc') && this.selectedGseControl) {
      const newGseControl = updateElementReference(
        this.doc,
        this.selectedGseControl
      );

      this.selectedGseControl = newGseControl ?? undefined;
      this.selectedDataSet = this.selectedGseControl
        ? updateElementReference(this.doc, this.selectedDataSet!)
        : undefined;

      if (!newGseControl && this.selectionList && this.selectionList.selected)
        (this.selectionList.selected as ListItem).selected = false;
    }
  }

  private addNewDataSet(control: Element): void {
    const parent = control.parentElement;
    if (!parent) return;

    const insert = createDataSet(parent);
    if (!insert) return;

    const newName = (insert.node as Element).getAttribute('name');
    if (!newName) return;

    const update = { element: control, attributes: { datSet: newName } };

    this.dispatchEvent(newEditEvent([insert, update]));

    this.selectedDataSet =
      this.selectedGseControl?.parentElement?.querySelector(
        `DataSet[name="${this.selectedGseControl.getAttribute('datSet')}"]`
      );
  }

  private selectDataSet(): void {
    const dataSetElement = (
      this.selectDataSetDialog.querySelector(
        'action-filtered-list'
      ) as ActionFilteredList
    ).selected;
    if (!dataSetElement) return;

    const dataSetName = (dataSetElement as ListItemBase).value;
    const dataSet = this.selectedGseControl?.parentElement?.querySelector(
      `DataSet[name="${dataSetName}"]`
    );
    if (!dataSet) return;

    this.dispatchEvent(
      newEditEvent({
        element: this.selectedGseControl!,
        attributes: { datSet: dataSetName },
      })
    );
    this.selectedDataSet = dataSet;

    this.selectDataSetDialog.close();
  }

  private selectGSEControl(evt: Event): void {
    const id = ((evt.target as ActionFilteredList).selected as ListItem).value;
    const gseControl = find(this.doc, 'GSEControl', id);
    if (!gseControl) return;

    this.selectedGseControl = gseControl;

    if (gseControl) {
      this.selectedDataSet = gseControl.parentElement?.querySelector(
        `DataSet[name="${gseControl.getAttribute('datSet')}"]`
      );
      (evt.target as ActionFilteredList).classList.add('hidden');
      this.selectGSEControlButton.classList.remove('hidden');
    }
  }

  private renderSelectDataSetDialog(): TemplateResult {
    return html`
      <mwc-dialog heading="Select Data Set">
        <action-filtered-list activatable @action=${() => this.selectDataSet()}
          >${Array.from(
            this.selectedGseControl?.parentElement?.querySelectorAll(
              'DataSet'
            ) ?? []
          ).map(
            dataSet =>
              html`<mwc-list-item
                twoline
                ?selected=${(this.selectedDataSet?.getAttribute('name') ??
                  'UNDEFINED') ===
                (dataSet.getAttribute('name') ?? 'UNDEFINED')}
                value="${dataSet.getAttribute('name') ?? 'UNDEFINED'}"
                ><span>${dataSet.getAttribute('name') ?? 'UNDEFINED'}</span>
                <span slot="secondary">${identity(dataSet)}</span>
              </mwc-list-item>`
          )}
        </action-filtered-list>
      </mwc-dialog>
    `;
  }

  private renderElementEditorContainer(): TemplateResult {
    if (this.selectedGseControl !== undefined)
      return html`<div class="elementeditorcontainer">
        <div class="content dataSet">
          ${this.renderSelectDataSetDialog()}
          <data-set-element-editor
            .element=${this.selectedDataSet!}
            .showHeader=${false}
            editCount="${this.editCount}"
          >
            <mwc-icon-button
              class="change dataset"
              slot="change"
              icon="swap_vert"
              ?disabled=${!!findControlBlockSubscription(
                this.selectedGseControl
              ).length}
              @click=${() => this.selectDataSetDialog.show()}
            ></mwc-icon-button>
            <mwc-icon-button
              class="new dataset"
              slot="new"
              icon="playlist_add"
              ?disabled=${!!this.selectedGseControl.getAttribute('datSet')}
              @click="${() => {
                this.addNewDataSet(this.selectedGseControl!);
              }}"
            ></mwc-icon-button
          ></data-set-element-editor>
        </div>
        <gse-control-element-editor
          .doc=${this.doc}
          .element=${this.selectedGseControl}
          editCount="${this.editCount}"
        ></gse-control-element-editor>
      </div>`;

    return html``;
  }

  private renderSelectionList(): TemplateResult {
    return html`<action-filtered-list
      activatable
      @action=${this.selectGSEControl}
      class="selectionlist"
      >${Array.from(this.doc.querySelectorAll('IED')).flatMap(ied => {
        const ieditem = html`<mwc-list-item
            class="listitem header"
            noninteractive
            graphic="icon"
            value="${Array.from(ied.querySelectorAll('GSEControl'))
              .map(element => {
                const id = identity(element) as string;
                return typeof id === 'string' ? id : '';
              })
              .join(' ')}"
          >
            <span>${ied.getAttribute('name')}</span>
            <mwc-icon slot="graphic">developer_board</mwc-icon>
          </mwc-list-item>
          <li divider role="separator"></li>
          <mwc-list-item
            slot="primaryAction"
            style="height:56px;"
            @request-selected="${(evt: Event) => {
              evt.stopPropagation();

              const insertDataSet = createGSEControl(ied);
              if (insertDataSet)
                this.dispatchEvent(newEditEvent(insertDataSet));
            }}"
            ><mwc-icon>playlist_add</mwc-icon></mwc-list-item
          >
          <li slot="primaryAction" divider role="separator"></li>`;

        const gseControls = Array.from(ied.querySelectorAll('GSEControl')).map(
          gseControl =>
            html`<mwc-list-item
                twoline
                value="${identity(gseControl)}"
                graphic="icon"
                ><span>${gseControl.getAttribute('name')}</span
                ><span slot="secondary">${identity(gseControl)}</span>
                <mwc-icon slot="graphic">${gooseIcon}</mwc-icon>
              </mwc-list-item>
              <mwc-list-item
                style="height:72px;"
                slot="primaryAction"
                @request-selected="${(evt: Event) => {
                  evt.stopPropagation();
                  this.dispatchEvent(
                    newEditEvent(removeControlBlock({ node: gseControl }))
                  );
                }}"
              >
                <mwc-icon>delete</mwc-icon>
              </mwc-list-item>`
        );

        return [ieditem, ...gseControls];
      })}</action-filtered-list
    >`;
  }

  private renderToggleButton(): TemplateResult {
    return html`<mwc-button
      class="change scl element"
      outlined
      label="Selected GOOSE"
      @click=${() => {
        this.selectionList.classList.remove('hidden');
        this.selectGSEControlButton.classList.add('hidden');
      }}
    ></mwc-button>`;
  }

  render(): TemplateResult {
    if (!this.doc) return html`No SCL loaded`;

    return html`${this.renderToggleButton()}
      <div class="section">
        ${this.renderSelectionList()}${this.renderElementEditorContainer()}
      </div>`;
  }

  static styles = css`
    ${styles}

    .elementeditorcontainer {
      flex: 65%;
      margin: 4px 8px 4px 4px;
      background-color: var(--mdc-theme-surface);
      overflow-y: scroll;
      display: grid;
      grid-gap: 12px;
      padding: 8px 12px 16px;
      grid-template-columns: repeat(3, 1fr);
    }
    .content.dataSet {
      display: flex;
      flex-direction: column;
    }

    data-set-element-editor {
      grid-column: 1 / 2;
    }

    gse-control-element-editor {
      grid-column: 2 / 4;
    }

    mwc-list-item {
      --mdc-list-item-meta-size: 48px;
    }

    mwc-icon-button[icon='playlist_add'] {
      pointer-events: all;
    }

    @media (max-width: 950px) {
      .elementeditorcontainer {
        display: block;
      }
    }
  `;
}