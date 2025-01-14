import { css, html, TemplateResult } from 'lit';
import { customElement, query } from 'lit/decorators.js';

import '@material/mwc-button';
import type { Button } from '@material/mwc-button';

// eslint-disable-next-line import/no-extraneous-dependencies
import { newEditEvent } from '@openscd/open-scd-core';
import { createGSEControl, removeControlBlock } from '@openenergytools/scl-lib';
import {
  ActionItem,
  ActionList,
} from '@openenergytools/filterable-lists/dist/action-list.js';

import './gse-control-element-editor.js';

import {
  pathIdentity,
  styles,
  updateElementReference,
} from '../../foundation.js';
import BaseElementEditor from '../base-element-editor.js';

@customElement('gse-control-editor')
export class GseControlEditor extends BaseElementEditor {
  @query('.selectionlist') selectionList!: ActionList;

  @query('mwc-button') selectGSEControlButton!: Button;

  /** Resets selected GOOSE and its DataSet, if not existing in new doc */
  update(props: Map<string | number | symbol, unknown>): void {
    super.update(props);

    if (props.has('doc') && this.selectCtrlBlock) {
      const newGseControl = updateElementReference(
        this.doc,
        this.selectCtrlBlock
      );

      this.selectCtrlBlock = newGseControl ?? undefined;
      this.selectedDataSet = this.selectCtrlBlock
        ? updateElementReference(this.doc, this.selectedDataSet!)
        : undefined;

      /* TODO(Jakob Vogelsang): comment when action-list is activeable
      if (!newGseControl && this.selectionList && this.selectionList.selected)
        (this.selectionList.selected as ListItem).selected = false; */
    }
  }

  protected renderElementEditorContainer(): TemplateResult {
    if (this.selectCtrlBlock !== undefined)
      return html`<div class="elementeditorcontainer">
        ${this.renderDataSetElementContainer()}
        <gse-control-element-editor
          .doc=${this.doc}
          .element=${this.selectCtrlBlock}
          editCount="${this.editCount}"
        ></gse-control-element-editor>
      </div>`;

    return html``;
  }

  private renderSelectionList(): TemplateResult {
    const items = Array.from(this.doc.querySelectorAll(':root > IED')).flatMap(
      ied => {
        const gseControls = Array.from(
          ied.querySelectorAll(
            ':scope > AccessPoint > Server > LDevice > LN0 > GSEControl'
          )
        );

        const item: ActionItem = {
          headline: `${ied.getAttribute('name')}`,
          startingIcon: 'developer_board',
          divider: true,
          filtergroup: gseControls.map(
            gseControl => gseControl.getAttribute('name') ?? ''
          ),
          actions: [
            {
              icon: 'playlist_add',
              callback: () => {
                const insertGseControl = createGSEControl(ied);
                if (insertGseControl)
                  this.dispatchEvent(newEditEvent(insertGseControl));
              },
            },
          ],
        };

        const dataset: ActionItem[] = gseControls.map(gseControl => ({
          headline: `${gseControl.getAttribute('name')}`,
          supportingText: `${pathIdentity(gseControl)}`,
          primaryAction: () => {
            this.selectCtrlBlock = gseControl;
            this.selectedDataSet =
              gseControl.parentElement?.querySelector(
                `DataSet[name="${gseControl.getAttribute('datSet')}"]`
              ) ?? null;

            this.selectionList.classList.add('hidden');
            this.selectGSEControlButton.classList.remove('hidden');
          },
          actions: [
            {
              icon: 'delete',
              callback: () => {
                this.dispatchEvent(
                  newEditEvent(removeControlBlock({ node: gseControl }))
                );
              },
            },
          ],
        }));

        return [item, ...dataset];
      }
    );

    return html`<action-list
      class="selectionlist"
      filterable
      searchhelper="Filter GSEControl's"
      .items=${items}
    ></action-list>`;
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
