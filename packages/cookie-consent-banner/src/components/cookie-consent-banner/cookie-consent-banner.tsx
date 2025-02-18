/* eslint-disable @typescript-eslint/no-unsafe-return,no-unused-vars,@typescript-eslint/no-unused-vars */
// https://github.com/ionic-team/stencil/blob/master/BREAKING_CHANGES.md
import {
  Component,
  Event,
  EventEmitter,
  Listen,
  h,
  State,
  Prop,
  JSX,
} from "@stencil/core";
import { CategoryItem } from "./types";

@Component({
  tag: "cookie-consent-banner",
  styleUrl: "cookie-consent-banner.css",
  shadow: true,
})
export class CookieConsentBanner {
  // ===========================================================================
  // PROPS
  // ===========================================================================

  // Available Categories
  @Prop() public availableCategories: CategoryItem[] = [];

  // Overwrite Cookie Name
  @Prop() public cookieName = "cookies_accepted_categories";

  // Overwrite Cookie Domain
  @Prop() public cookieDomain = document.location.hostname;

  // Site Cookies will be deleted if consent for any category is withdrawn. Set to true to disable behaviour.
  @Prop() public disableResetSiteCookiesOnConsentWithdrawn = false;

  // Add Headline
  @Prop() public headline: string;

  // BTN Label Accept and Continue
  @Prop() public btnLabelAcceptAndContinue: string;

  // BTN Label Accept and Continue
  @Prop() public btnLabelAllAndContinue: string;

  // BTN Label Only essential and Continue
  @Prop() public btnLabelOnlyEssentialAndContinue: string;

  // CONTENT Settings Description
  @Prop() public contentSettingsDescription: string;

  // Event Handler
  @Prop() public handlePreferencesRestored: ({
    acceptedCategories,
  }: {
    acceptedCategories: string[];
  }) => void;

  // Event Handler
  @Prop() public handlePreferencesUpdated: ({
    acceptedCategories,
  }: {
    acceptedCategories: string[];
  }) => void;

  // =============================================================================
  // STATES
  // =============================================================================

  @State() public isShown = false;

  @State() public acceptedCategoriesNext: string[] = [];

  @State() public acceptedCategoriesPersisted: string[] = [];

  @State() public isShownSettings = false;

  // Trigger isShown via Event
  @Listen("cookie_consent_show", { target: "document" })
  public eventListenerShow(): void {
    this.isShown = true;
  }

  // Trigger isShown and isShownSettings via Event
  @Listen("cookie_consent_details_show", { target: "document" })
  public eventListenerDetailsShow(): void {
    this.isShown = true;
    this.isShownSettings = true;
  }

  // ===========================================================================
  // EVENTS
  // ===========================================================================

  // Cookie Consent has been given previously
  @Event({
    eventName: "cookie_consent_preferences_restored",
    composed: true,
    cancelable: true,
    bubbles: true,
  })
  public eventCookieConsentRestored: EventEmitter;

  // Cookie Consent updated or initially given
  @Event({
    eventName: "cookie_consent_preferences_updated",
    composed: true,
    cancelable: true,
    bubbles: true,
  })
  public eventCookieConsentUpdated: EventEmitter;

  // ===========================================================================

  /* eslint-disable-next-line @typescript-eslint/explicit-member-accessibility */
  public componentWillLoad(): void {
    const defaultCookies = this.availableCategories
      .filter((category) => category.isMandatory)
      .map((category) => category.key);
    const cookieValueString = `; ${document.cookie}`
      .split(`; ${this.cookieName}=`)
      .pop()
      .split(";")
      .shift();
    const cookieValues = cookieValueString ? cookieValueString.split(",") : [];

    if (cookieValues.length === 0) {
      this.isShown = true;
      // Nothing stored yet
      this.acceptedCategoriesPersisted = defaultCookies;
      this.acceptedCategoriesNext = defaultCookies;
    } else {
      this.acceptedCategoriesPersisted = cookieValues;
      this.acceptedCategoriesNext = cookieValues;
      this.eventCookieConsentRestored.emit({
        acceptedCategories: cookieValues,
      });
      if (this.handlePreferencesRestored) {
        this.handlePreferencesRestored({
          acceptedCategories: cookieValues,
        });
      }
    }
  }

  private persistSelection(): void {
    // Need to reset cookies?
    const consentWithdrawn = Boolean(
      this.acceptedCategoriesPersisted.filter(
        (x) => !this.acceptedCategoriesNext.includes(x)
      ).length
    );
    // Reset cookies
    if (!this.disableResetSiteCookiesOnConsentWithdrawn && consentWithdrawn) {
      document.cookie.split(";").forEach((c) => {
        document.cookie = c
          .replace(/^ +/, "")
          .replace(/=.*/, `=;expires=${new Date().toUTCString()};path=/`);
      });
    }

    this.acceptedCategoriesPersisted = this.acceptedCategoriesNext;
    const cookieValue = this.acceptedCategoriesNext.join(",");
    document.cookie = `${this.cookieName}=${cookieValue};domain=${this.cookieDomain};max-age=50400000;path=/`;
    this.eventCookieConsentUpdated.emit({
      acceptedCategories: this.acceptedCategoriesPersisted,
    });
    if (this.handlePreferencesUpdated) {
      this.handlePreferencesUpdated({
        acceptedCategories: this.acceptedCategoriesPersisted,
      });
    }
    this.isShown = false;
  }

  private handleAcceptAll(): void {
    this.acceptedCategoriesNext = this.availableCategories.map(
      (category) => category.key
    );
    this.persistSelection();
  }

  /* eslint-disable-next-line @typescript-eslint/explicit-member-accessibility,@typescript-eslint/member-ordering */
  public render(): JSX.Element {
    if (!this.isShown) {
      return null;
    }
    return (
      <div class="cc">
        <div
          class="cc_body"
          role="dialog"
          aria-modal="true"
          aria-label="Cookie Consent Management"
          tabIndex={-1}
        >
          {Boolean(this.headline) && (
            <h1 class="cc_headline">{this.headline}</h1>
          )}
          <form>
            <p class="cc_text">
              <slot />
            </p>
            {Boolean(this.isShownSettings) && (
              <div class="cc_settings">
                <p class="cc_settings_description">
                  {this.contentSettingsDescription}
                </p>
                <div class="cc_checkboxes">
                  {this.availableCategories.map((category) => {
                    return (
                      <label
                        class="cc_checkboxes_item"
                        htmlFor={`check-category-${category.label}`}
                      >
                        <input
                          id={`check-category-${category.label}`}
                          type="checkbox"
                          disabled={category?.isMandatory ?? false}
                          checked={this.acceptedCategoriesNext.includes(
                            category.key
                          )}
                          onChange={(event): void => {
                            const isChecked = (
                              event?.currentTarget as HTMLInputElement
                            )?.checked;
                            if (isChecked) {
                              this.acceptedCategoriesNext = [
                                ...this.acceptedCategoriesNext,
                                category.key,
                              ];
                            } else {
                              this.acceptedCategoriesNext =
                                this.acceptedCategoriesNext.filter(
                                  (item) => item !== category.key
                                );
                            }
                          }}
                        />{" "}
                        {category.label}
                        {": "}
                        {category.description}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
            <div class="cc_buttons">
              {Boolean(this.isShownSettings) && (
                <button
                  type="submit"
                  class="secondary"
                  onClick={() => this.persistSelection()}
                  onKeyPress={() => this.persistSelection()}
                >
                  {this.btnLabelAcceptAndContinue}
                </button>
              )}
              {!this.isShownSettings &&
                !!this.btnLabelOnlyEssentialAndContinue && (
                  <button
                    class="secondary"
                    type="button"
                    onClick={() => this.persistSelection()}
                    onKeyPress={() => this.persistSelection()}
                  >
                    {this.btnLabelOnlyEssentialAndContinue}
                  </button>
                )}
              <button
                onClick={() => this.handleAcceptAll()}
                onKeyPress={() => this.handleAcceptAll()}
                type="button"
              >
                {!this.isShownSettings
                  ? this.btnLabelAcceptAndContinue
                  : this.btnLabelAllAndContinue}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }
}
