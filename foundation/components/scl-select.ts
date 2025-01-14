import { customElement, property, query, state } from 'lit/decorators.js';

import '@material/mwc-switch';
import type { Switch } from '@material/mwc-switch';
import { Select } from '@material/mwc-select';
import { html } from 'lit';

/** A potentially `nullable` `Select`.
 *
 * NB: Use `maybeValue: string | null` instead of `value` if `nullable`! */
@customElement('scl-select')
export class SclSelect extends Select {
  /** Whether [[`maybeValue`]] may be `null` */
  @property({ type: Boolean })
  nullable = false;

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

  /** Replacement for `value`, can only be `null` if [[`nullable`]]. */
  @property({ type: String })
  get maybeValue(): string | null {
    return this.null ? null : this.value;
  }

  set maybeValue(value: string | null) {
    if (value === null) this.null = true;
    else {
      this.null = false;
      this.value = value;
    }
  }

  /** The default `value` displayed if [[`maybeValue`]] is `null`. */
  @property({ type: String })
  defaultValue = '';

  /** Additional values that cause validation to fail. */
  @property({ type: Array })
  reservedValues: string[] = [];

  // FIXME: workaround to allow disable of the whole component - need basic refactor
  private disabledSwitch = false;

  @query('mwc-switch') nullSwitch?: Switch;

  private nulled: string | null = null;

  private enable(): void {
    if (this.nulled === null) return;
    this.value = this.nulled;
    this.nulled = null;
    this.disabled = false;
  }

  private disable(): void {
    if (this.nulled !== null) return;
    this.nulled = this.value;
    this.value = this.defaultValue;
    this.disabled = true;
  }

  async firstUpdated(): Promise<void> {
    await super.firstUpdated();
  }

  checkValidity(): boolean {
    if (this.nullable && !this.nullSwitch?.selected) return true;
    return super.checkValidity();
  }

  constructor() {
    super();

    // eslint-disable-next-line wc/no-constructor-attributes
    this.disabledSwitch = this.hasAttribute('disabled');
  }

  renderSwitch() {
    if (this.nullable) {
      return html`<mwc-switch
        style="margin-left: 12px;"
        ?selected=${!this.null}
        ?disabled=${this.disabledSwitch}
        @click=${() => {
          this.null = !this.nullSwitch!.selected;
          this.dispatchEvent(new Event('selected'));
        }}
      ></mwc-switch>`;
    }
    return html``;
  }

  render() {
    return html`
      <div style="display: flex; flex-direction: row;">
        <div style="flex: auto;">${super.render()}</div>
        <div style="display: flex; align-items: center; height: 56px;">
          ${this.renderSwitch()}
        </div>
      </div>
    `;
  }
}
