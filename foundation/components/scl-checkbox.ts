import { customElement, property, query, state } from 'lit/decorators.js';

import '@material/mwc-formfield';
import '@material/mwc-switch';
import '@material/mwc-checkbox';
import type { Checkbox } from '@material/mwc-checkbox';
import type { Switch } from '@material/mwc-switch';
import { html, LitElement } from 'lit';

/** A potentially `nullable` labelled checkbox. */
@customElement('scl-checkbox')
export class SclCheckbox extends LitElement {
  @property({ type: String })
  label = '';

  /** Parenthetical information rendered after the label: `label (helper)` */
  @property({ type: String })
  helper = '';

  /** Whether [[`maybeValue`]] may be `null` */
  @property({ type: Boolean })
  nullable = false;

  /** The default `checked` state while [[`maybeValue`]] is `null`. */
  @property({ type: Boolean })
  defaultChecked = false;

  /** Is `"true"` when checked, `"false"` un-checked, `null` if [[`nullable`]]. */
  @property({ type: String })
  get maybeValue(): string | null {
    // eslint-disable-next-line no-nested-ternary
    return this.null ? null : this.checked ? 'true' : 'false';
  }

  set maybeValue(check: string | null) {
    if (check === null) this.null = true;
    else {
      this.null = false;
      this.checked = check === 'true';
    }
  }

  /** Disables component including null switch */
  @property({ type: Boolean })
  disabled = false;

  private isNull = false;

  @state()
  private get null(): boolean {
    return this.nullable && this.isNull;
  }

  private set null(value: boolean) {
    if (!this.nullable || value === this.isNull) return;
    this.isNull = value;
    if (this.null) this.disable();
    else this.enable();
  }

  private initChecked = false;

  @state()
  get checked(): boolean {
    return this.checkbox?.checked ?? this.initChecked;
  }

  set checked(value: boolean) {
    if (this.checkbox) this.checkbox.checked = value;
    else this.initChecked = value;
  }

  @state()
  private deactivateCheckbox = false;

  @state()
  get formfieldLabel(): string {
    return this.helper ? `${this.helper} (${this.label})` : this.label;
  }

  @query('mwc-switch') nullSwitch?: Switch;

  @query('mwc-checkbox') checkbox?: Checkbox;

  // eslint-disable-next-line class-methods-use-this
  checkValidity(): boolean {
    return true;
  }

  private nulled: boolean | null = null;

  private enable(): void {
    if (this.nulled === null) return;
    this.checked = this.nulled;
    this.nulled = null;
    this.deactivateCheckbox = false;
  }

  private disable(): void {
    if (this.nulled !== null) return;
    this.nulled = this.checked;
    this.checked = this.defaultChecked;
    this.deactivateCheckbox = true;
  }

  firstUpdated(): void {
    this.requestUpdate();
  }

  renderSwitch() {
    if (this.nullable) {
      return html`<mwc-switch
        style="margin-left: 12px;"
        ?selected=${!this.null}
        ?disabled=${this.disabled}
        @click=${() => {
          this.null = !this.nullSwitch!.selected;
          this.dispatchEvent(new Event('input'));
        }}
      ></mwc-switch>`;
    }
    return html``;
  }

  render() {
    return html`
      <div style="display: flex; flex-direction: row;">
        <div style="flex: auto;">
          <mwc-formfield
            label="${this.formfieldLabel}"
            style="${this.deactivateCheckbox || this.disabled
              ? `--mdc-theme-text-primary-on-background:rgba(0, 0, 0, 0.38)`
              : ``}"
            ><mwc-checkbox
              ?checked=${this.initChecked}
              ?disabled=${this.deactivateCheckbox || this.disabled}
              @change=${() => this.dispatchEvent(new Event('input'))}
            ></mwc-checkbox
          ></mwc-formfield>
        </div>
        <div style="display: flex; align-items: center;">
          ${this.renderSwitch()}
        </div>
      </div>
    `;
  }
}
