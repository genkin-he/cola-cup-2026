# OIDC Login Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a generic, configurable OIDC login to the `rails/` app as a second OmniAuth provider equal to Twitter/X, with both providers independently optional (Twitter-only, OIDC-only, or both).

**Architecture:** Add the `omniauth_openid_connect` strategy onto the existing Devise + OmniAuth chain. Provider enablement is driven by env-var presence and centralized in a new `AuthProviders` module read at call-time by the initializer, model, and views. `User.from_omniauth` is generalized from a hard-coded `"twitter"` provider to an `auth.provider`-keyed map; the avatar `_normal→_400x400` rewrite becomes Twitter-only. OIDC `sub` becomes its own `Account` — no cross-provider linking, no email storage.

**Tech Stack:** Ruby on Rails 8.1, Devise 5, OmniAuth, `omniauth_openid_connect`, `omniauth-rails_csrf_protection`, RSpec + FactoryBot, SQLite.

**Spec:** `docs/specs/2026-06-12-oidc-login-design.md`

**Conventions:**
- All paths below are relative to the repo root; **all commands run from `rails/`** (`cd rails` first).
- Test runner: `bundle exec rspec`. Linter: `bin/rubocop -a` (rails-omakase).
- UI copy is inline Chinese in ERB (no i18n locale keys) — follow that.
- OmniAuth login buttons MUST use `button_to` (POST + CSRF token); `omniauth-rails_csrf_protection` rejects GET request-phase links.
- Commit after each task. Branch: `feat/oidc-login` (already checked out).

---

## File Structure

| File | Responsibility | Action |
|---|---|---|
| `rails/Gemfile` | Add `omniauth_openid_connect` | Modify |
| `rails/app/models/auth_providers.rb` | Single source of truth: which providers are on + display strings | Create |
| `rails/config/initializers/devise.rb` | Conditionally register `twitter2` and `openid_connect` strategies | Modify |
| `rails/app/models/user.rb` | Generalize `from_omniauth` across providers; Twitter-only avatar rewrite; list both providers | Modify |
| `rails/app/controllers/users/omniauth_callbacks_controller.rb` | Add `openid_connect` action sharing a private `handle_omniauth` | Modify |
| `rails/app/views/identities/show.html.erb` | Conditional per-provider buttons + neutral copy + none-configured notice | Modify |
| `rails/config/initializers/omniauth_test_mode.rb` | Add an OIDC dev mock | Modify |
| `rails/.env.example` | Document OIDC vars + `AUTH_URL`/callback registration | Modify |
| `rails/spec/models/auth_providers_spec.rb` | Unit-test enablement logic | Create |
| `rails/spec/models/user_omniauth_spec.rb` | Add OIDC `from_omniauth` cases | Modify |
| `rails/spec/requests/users/omniauth_callbacks_spec.rb` | Add `openid_connect` callback integration | Modify |
| `rails/spec/requests/identities_spec.rb` | Login-page button visibility per enablement combo | Create |

---

## Task 1: Add the `omniauth_openid_connect` gem

**Files:**
- Modify: `rails/Gemfile` (auth section, after line 40)

- [ ] **Step 1: Add the gem next to the other OmniAuth gems**

In `rails/Gemfile`, under the `# Authentication:` block, after `gem "omniauth-rails_csrf_protection"`:

```ruby
# Generic OpenID Connect login (second, optional provider alongside Twitter/X)
gem "omniauth_openid_connect"
```

- [ ] **Step 2: Install**

Run (from `rails/`): `bundle install`
Expected: resolves and installs `omniauth_openid_connect` (+ its `openid_connect` dependency); `Gemfile.lock` updated. (Requires network access to rubygems.)

- [ ] **Step 3: Verify the app still boots**

Run: `bin/rails runner 'puts "boot ok"'`
Expected: prints `boot ok` with no load errors.

- [ ] **Step 4: Commit**

```bash
git add Gemfile Gemfile.lock
git commit -m "feat(rails): add omniauth_openid_connect gem"
```

---

## Task 2: `AuthProviders` module (TDD)

Central enablement/display logic, read at call-time (so specs and views can rely on env without rebooting the initializer).

**Files:**
- Create: `rails/app/models/auth_providers.rb`
- Test: `rails/spec/models/auth_providers_spec.rb`

- [ ] **Step 1: Write the failing test**

Create `rails/spec/models/auth_providers_spec.rb`:

```ruby
require "rails_helper"

RSpec.describe AuthProviders do
  around do |example|
    original = ENV.to_hash
    example.run
    ENV.replace(original)
  end

  describe ".twitter_enabled?" do
    it "is true only when AUTH_TWITTER_ID is present" do
      ENV["AUTH_TWITTER_ID"] = "abc"
      expect(described_class.twitter_enabled?).to be(true)

      ENV.delete("AUTH_TWITTER_ID")
      expect(described_class.twitter_enabled?).to be(false)
    end
  end

  describe ".oidc_enabled?" do
    it "is true only when OIDC_ISSUER is present" do
      ENV["OIDC_ISSUER"] = "https://idp.example/realms/x"
      expect(described_class.oidc_enabled?).to be(true)

      ENV.delete("OIDC_ISSUER")
      expect(described_class.oidc_enabled?).to be(false)
    end
  end

  describe ".oidc_display_name" do
    it "defaults to 'OIDC 登录' and honors OIDC_DISPLAY_NAME" do
      ENV.delete("OIDC_DISPLAY_NAME")
      expect(described_class.oidc_display_name).to eq("OIDC 登录")

      ENV["OIDC_DISPLAY_NAME"] = "用公司账号登录"
      expect(described_class.oidc_display_name).to eq("用公司账号登录")
    end
  end

  describe ".any_enabled?" do
    it "is true when at least one provider is enabled" do
      ENV.delete("AUTH_TWITTER_ID")
      ENV.delete("OIDC_ISSUER")
      expect(described_class.any_enabled?).to be(false)

      ENV["OIDC_ISSUER"] = "https://idp.example/realms/x"
      expect(described_class.any_enabled?).to be(true)
    end
  end
end
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `bundle exec rspec spec/models/auth_providers_spec.rb`
Expected: FAIL — `uninitialized constant AuthProviders`.

- [ ] **Step 3: Implement the module**

Create `rails/app/models/auth_providers.rb`:

```ruby
# Single source of truth for which login providers are enabled and how they are
# labelled. Read at call-time (not boot) so callers reflect the current ENV.
# Presence of the provider's key env var is the on/off switch.
module AuthProviders
  module_function

  def twitter_enabled?
    ENV["AUTH_TWITTER_ID"].present?
  end

  def oidc_enabled?
    ENV["OIDC_ISSUER"].present?
  end

  def oidc_display_name
    ENV["OIDC_DISPLAY_NAME"].presence || "OIDC 登录"
  end

  def any_enabled?
    twitter_enabled? || oidc_enabled?
  end
end
```

- [ ] **Step 4: Run it to confirm it passes**

Run: `bundle exec rspec spec/models/auth_providers_spec.rb`
Expected: PASS (4 examples).

- [ ] **Step 5: Commit**

```bash
git add app/models/auth_providers.rb spec/models/auth_providers_spec.rb
git commit -m "feat(rails): add AuthProviders enablement module"
```

---

## Task 3: Generalize `User.from_omniauth` across providers (TDD)

Replace the hard-coded `PROVIDER = "twitter"` with an `auth.provider`-keyed map, list both providers in `omniauth_providers`, and make the avatar `_normal→_400x400` rewrite Twitter-only.

**Files:**
- Modify: `rails/app/models/user.rb` (lines 4-5 providers list; 9-11 constant; 53-78 `from_omniauth`/`normalize_avatar`)
- Test: `rails/spec/models/user_omniauth_spec.rb`

- [ ] **Step 1: Add failing OIDC tests**

Append inside the `RSpec.describe User, ".from_omniauth"` block in `rails/spec/models/user_omniauth_spec.rb` (after the existing examples), and add an OIDC auth-hash helper near the top of the block:

```ruby
  def oidc_auth_hash(uid: "sub-123", name: "Ada Lovelace", nickname: "ada", image: "https://idp/pic.png")
    OmniAuth::AuthHash.new(
      provider: "openid_connect", uid: uid,
      info: { name: name, nickname: nickname, image: image }
    )
  end

  it "creates a user and an 'oidc' account on first OIDC login, sub as account id" do
    expect { User.from_omniauth(oidc_auth_hash) }
      .to change(User, :count).by(1).and change(Account, :count).by(1)

    account = User.last.accounts.first
    expect(account.provider).to eq("oidc")            # normalized from "openid_connect"
    expect(account.provider_account_id).to eq("sub-123")
    expect(account.username).to eq("ada")
  end

  it "uses the OIDC picture claim verbatim (no _400x400 rewrite)" do
    user = User.from_omniauth(oidc_auth_hash(image: "https://idp/avatar_normal.png"))
    expect(user.avatar_url).to eq("https://idp/avatar_normal.png") # unchanged
  end

  it "keeps Twitter and OIDC identities as separate users even with the same handle" do
    twitter = User.from_omniauth(auth_hash(uid: "100", nickname: "samehandle"))
    oidc    = User.from_omniauth(oidc_auth_hash(uid: "200", nickname: "samehandle"))
    expect(oidc.id).not_to eq(twitter.id)
    expect(Account.where(username: "samehandle").pluck(:provider)).to contain_exactly("twitter", "oidc")
  end
```

- [ ] **Step 2: Run to confirm the new tests fail**

Run: `bundle exec rspec spec/models/user_omniauth_spec.rb`
Expected: the 3 new examples FAIL (e.g. provider stored as `"twitter"` / `KeyError` on the OIDC provider, or `_normal` rewritten). Existing examples still pass.

- [ ] **Step 3: Implement the generalization**

In `rails/app/models/user.rb`:

Replace the providers list (lines 4-5):

```ruby
  devise :database_authenticatable, :rememberable, :omniauthable,
    omniauth_providers: [ :twitter2, :openid_connect ]
```

Replace the `PROVIDER` constant (lines 9-11) with:

```ruby
  # Maps the OmniAuth strategy name to the provider value stored on Account.
  # "twitter2" is normalised to "twitter" so legacy data / SETTLER_USERNAMES
  # matching stay unchanged.
  PROVIDERS = { "twitter2" => "twitter", "openid_connect" => "oidc" }.freeze
```

Rewrite `from_omniauth` (lines 53-73) so it derives the provider and avatar from `auth.provider`:

```ruby
  def self.from_omniauth(auth)
    provider = PROVIDERS.fetch(auth.provider.to_s)
    provider_account_id = auth.uid.to_s
    username = auth.info.nickname.presence
    avatar_url = avatar_for(auth.provider.to_s, auth.info.image)

    account = Account.find_by(provider: provider, provider_account_id: provider_account_id)
    if account
      account.update!(username: username, avatar_url: avatar_url)
      account.user.update!(avatar_url: avatar_url) # nickname / emoji untouched
      return account.user
    end

    transaction do
      user = create!(nickname: nickname_from(auth.info.name), avatar_url: avatar_url)
      user.accounts.create!(
        provider: provider, provider_account_id: provider_account_id,
        username: username, avatar_url: avatar_url
      )
      user
    end
  end
```

Replace `normalize_avatar` (lines 75-78) with a provider-aware `avatar_for`:

```ruby
  # Twitter serves a 48px "_normal" avatar; request the 400px variant. Other
  # providers (e.g. the OIDC `picture` claim) are used as-is.
  def self.avatar_for(omniauth_provider, image)
    url = image.presence
    omniauth_provider == "twitter2" ? url&.sub("_normal", "_400x400") : url
  end
```

- [ ] **Step 4: Run the full model spec to confirm all pass**

Run: `bundle exec rspec spec/models/user_omniauth_spec.rb`
Expected: PASS (all original + 3 new examples).

- [ ] **Step 5: Commit**

```bash
git add app/models/user.rb spec/models/user_omniauth_spec.rb
git commit -m "feat(rails): generalize User.from_omniauth across providers"
```

---

## Task 4: Conditionally register both OmniAuth strategies

Make Twitter registration conditional (it is currently unconditional) and add the OIDC registration, both gated on `AuthProviders`.

**Files:**
- Modify: `rails/config/initializers/devise.rb` (the `# ==> OmniAuth` block, lines ~275-284)

- [ ] **Step 1: Replace the OmniAuth provider block**

In `rails/config/initializers/devise.rb`, replace the existing `config.omniauth :twitter2, …` registration (lines ~279-284) with:

```ruby
  # Each provider is independently optional — presence of its key env var is the
  # on/off switch (see AuthProviders). A deployment can run Twitter-only,
  # OIDC-only, or both.
  if AuthProviders.twitter_enabled?
    # Twitter (X) OAuth 2.0 only — no password entry. omniauth-twitter2 requests
    # profile_image_url so auth.info.image is populated.
    config.omniauth :twitter2,
      ENV["AUTH_TWITTER_ID"], ENV["AUTH_TWITTER_SECRET"],
      scope: "tweet.read users.read"
  end

  # Generic OIDC via discovery (issuer -> endpoints, JWKS, nonce/state). Scope is
  # openid+profile; we do not request or store email. redirect_uri is built from
  # AUTH_URL, which must match the served origin and be registered at the IdP.
  if AuthProviders.oidc_enabled?
    config.omniauth :openid_connect,
      name: :openid_connect,
      issuer: ENV["OIDC_ISSUER"],
      discovery: true,
      scope: [ :openid, :profile ],
      client_options: {
        identifier: ENV["OIDC_CLIENT_ID"],
        secret: ENV["OIDC_CLIENT_SECRET"],
        redirect_uri: "#{ENV['AUTH_URL']}/users/auth/openid_connect/callback"
      }
  end
```

Leave the `OmniAuth.config.on_failure` block (below the `Devise.setup` block) unchanged.

- [ ] **Step 2: Verify boot with neither provider configured (default test/dev)**

Run: `bin/rails runner 'puts OmniAuth::Strategies.constants.inspect rescue puts "ok"'`
Expected: boots cleanly (no provider registered when env unset — this is the none-configured case; the app still boots).

> If boot raises `NameError: uninitialized constant AuthProviders` (initializer runs before the autoload path resolves the constant), add `require_relative "../../app/models/auth_providers"` at the top of `config/initializers/devise.rb`. In Rails 8 the autoload paths are set before initializers run, so this is usually unnecessary — only add it if the boot check fails.

- [ ] **Step 3: Verify OIDC registers when configured**

Run:
```bash
OIDC_ISSUER=https://example.com OIDC_CLIENT_ID=x OIDC_CLIENT_SECRET=y AUTH_URL=http://localhost:3000 \
  bin/rails runner 'puts OmniAuth.config.respond_to?(:test_mode); puts "registered openid_connect ok"'
```
Expected: prints `registered openid_connect ok` with no load error (the strategy is required and configured). Discovery is lazy, so no network call happens at boot.

- [ ] **Step 4: Commit**

```bash
git add config/initializers/devise.rb
git commit -m "feat(rails): conditionally register twitter2 and openid_connect"
```

---

## Task 5: `openid_connect` callback action (TDD)

Add the controller action and extract the shared body.

**Files:**
- Modify: `rails/app/controllers/users/omniauth_callbacks_controller.rb`
- Test: `rails/spec/requests/users/omniauth_callbacks_spec.rb`

- [ ] **Step 1: Add a failing OIDC callback context**

Append a new context to `rails/spec/requests/users/omniauth_callbacks_spec.rb` (mirroring the existing Twitter setup but for `:openid_connect`):

```ruby
  context "OIDC callback" do
    before do
      unless Rails.application.routes.url_helpers.respond_to?(:user_openid_connect_omniauth_callback_path)
        skip "openid_connect not in omniauth_providers yet"
      end

      OmniAuth.config.test_mode = true
      OmniAuth.config.mock_auth[:openid_connect] = OmniAuth::AuthHash.new(
        provider: "openid_connect", uid: "sub-9",
        info: { name: "Test OIDC", nickname: "oidcfan", image: "https://idp/p.png" }
      )
      Rails.application.env_config["omniauth.auth"] = OmniAuth.config.mock_auth[:openid_connect]
    end

    after do
      OmniAuth.config.test_mode = false
      OmniAuth.config.mock_auth[:openid_connect] = nil
      Rails.application.env_config.delete("omniauth.auth")
    end

    it "creates the user on first OIDC login and redirects to profile setup" do
      expect { post user_openid_connect_omniauth_callback_path }.to change(User, :count).by(1)
      expect(response).to redirect_to(me_settings_path)
      expect(User.last.accounts.first.provider).to eq("oidc")
    end

    it "sends a returning OIDC user (emoji set) to their dashboard" do
      User.from_omniauth(OmniAuth.config.mock_auth[:openid_connect]).update!(emoji: "🐉")
      post user_openid_connect_omniauth_callback_path
      expect(response).to redirect_to(me_path)
    end
  end
```

- [ ] **Step 2: Run to confirm failure**

Run: `bundle exec rspec spec/requests/users/omniauth_callbacks_spec.rb`
Expected: OIDC examples FAIL — `AbstractController::ActionNotFound` for `openid_connect` (route exists from Task 3's providers list, but no action). (Twitter examples still pass.)

- [ ] **Step 3: Implement the action + shared helper**

Replace the body of `rails/app/controllers/users/omniauth_callbacks_controller.rb` with:

```ruby
module Users
  class OmniauthCallbacksController < Devise::OmniauthCallbacksController
    # GET/POST /users/auth/twitter2/callback
    def twitter2
      handle_omniauth
    end

    # GET/POST /users/auth/openid_connect/callback
    def openid_connect
      handle_omniauth
    end

    private

    def handle_omniauth
      @user = User.from_omniauth(request.env["omniauth.auth"])

      if @user.persisted?
        @user.remember_me = true # 90-day remember cookie, like the legacy session
        sign_in_and_redirect @user, event: :authentication
      else
        redirect_to identity_path
      end
    end

    # First-time logins (no emoji chosen yet) land on the profile setup page;
    # returning users go to their dashboard.
    def after_sign_in_path_for(resource)
      resource.emoji.nil? ? me_settings_path : me_path
    end
  end
end
```

- [ ] **Step 4: Run to confirm all pass**

Run: `bundle exec rspec spec/requests/users/omniauth_callbacks_spec.rb`
Expected: PASS (Twitter + OIDC contexts).

- [ ] **Step 5: Commit**

```bash
git add app/controllers/users/omniauth_callbacks_controller.rb spec/requests/users/omniauth_callbacks_spec.rb
git commit -m "feat(rails): handle openid_connect omniauth callback"
```

---

## Task 6: Login page — conditional per-provider buttons (TDD)

**Files:**
- Modify: `rails/app/views/identities/show.html.erb`
- Test: `rails/spec/requests/identities_spec.rb`

- [ ] **Step 1: Write the failing request spec**

Create `rails/spec/requests/identities_spec.rb`:

```ruby
require "rails_helper"

RSpec.describe "Identity (login) page", type: :request do
  def stub_providers(twitter:, oidc:, oidc_name: "OIDC 登录")
    allow(AuthProviders).to receive(:twitter_enabled?).and_return(twitter)
    allow(AuthProviders).to receive(:oidc_enabled?).and_return(oidc)
    allow(AuthProviders).to receive(:any_enabled?).and_return(twitter || oidc)
    allow(AuthProviders).to receive(:oidc_display_name).and_return(oidc_name)
  end

  it "shows only the X button when Twitter-only" do
    stub_providers(twitter: true, oidc: false)
    get identity_path
    expect(response.body).to include("/users/auth/twitter2")
    expect(response.body).not_to include("/users/auth/openid_connect")
  end

  it "shows only the OIDC button when OIDC-only" do
    stub_providers(twitter: false, oidc: true, oidc_name: "用公司账号登录")
    get identity_path
    expect(response.body).to include("/users/auth/openid_connect")
    expect(response.body).to include("用公司账号登录")
    expect(response.body).not_to include("/users/auth/twitter2")
  end

  it "shows both buttons when both enabled" do
    stub_providers(twitter: true, oidc: true)
    get identity_path
    expect(response.body).to include("/users/auth/twitter2")
    expect(response.body).to include("/users/auth/openid_connect")
  end

  it "shows a notice when no provider is configured" do
    stub_providers(twitter: false, oidc: false)
    get identity_path
    expect(response.body).to include("暂未配置登录方式")
    expect(response.body).not_to include("/users/auth/")
  end
end
```

- [ ] **Step 2: Run to confirm failure**

Run: `bundle exec rspec spec/requests/identities_spec.rb`
Expected: FAIL — OIDC-only / notice cases fail (current view hard-codes the X button and has no OIDC button or notice).

- [ ] **Step 3: Implement the conditional view**

Replace `rails/app/views/identities/show.html.erb` with:

```erb
<section class="id-page">
  <h1 class="disp">登录<br><em>参与竞猜</em> 🥤</h1>
  <p class="lead">登录后自动带入头像和昵称，登录后可改昵称。</p>
  <div style="padding-top: 32px">
    <% if AuthProviders.twitter_enabled? %>
      <%= button_to "𝕏 用 Twitter 登录", "/users/auth/twitter2", class: "cta" %>
    <% end %>
    <% if AuthProviders.oidc_enabled? %>
      <%= button_to AuthProviders.oidc_display_name, "/users/auth/openid_connect", class: "cta" %>
    <% end %>
    <% unless AuthProviders.any_enabled? %>
      <p class="lead">暂未配置登录方式，请联系管理员。</p>
    <% end %>
  </div>
</section>
```

- [ ] **Step 4: Run to confirm the new spec passes**

Run: `bundle exec rspec spec/requests/identities_spec.rb`
Expected: PASS (4 examples).

- [ ] **Step 5: Fix the pre-existing identity test that assumed Twitter was always on**

`spec/requests/read_only_pages_spec.rb:64-68` asserts the X button renders unconditionally, but the test env has no `AUTH_TWITTER_ID`, so after this task `AuthProviders.twitter_enabled?` is `false` and the button is gone — this example would now fail. Stub providers on so the test keeps its intent (anonymous user sees a sign-in button). Replace that example's body:

```ruby
    it "shows the sign-in button when anonymous" do
      allow(AuthProviders).to receive(:twitter_enabled?).and_return(true)
      allow(AuthProviders).to receive(:any_enabled?).and_return(true)
      get identity_path
      expect(response).to have_http_status(:ok)
      expect(response.body).to include("参与竞猜", "/users/auth/twitter2")
    end
```

Run: `bundle exec rspec spec/requests/read_only_pages_spec.rb`
Expected: PASS (no regression).

- [ ] **Step 6: Commit**

```bash
git add app/views/identities/show.html.erb spec/requests/identities_spec.rb spec/requests/read_only_pages_spec.rb
git commit -m "feat(rails): conditional per-provider login buttons"
```

---

## Task 7: OIDC dev mock

Let OIDC-only local development exercise the login flow without a real IdP.

**Files:**
- Modify: `rails/config/initializers/omniauth_test_mode.rb`

- [ ] **Step 1: Register an OIDC mock when OIDC is enabled**

In `rails/config/initializers/omniauth_test_mode.rb`, inside the existing `if Rails.env.development? && ENV["OMNIAUTH_MOCK"].present?` block, after the `mock_auth[:twitter2]` assignment, add:

```ruby
  if AuthProviders.oidc_enabled?
    OmniAuth.config.mock_auth[:openid_connect] = OmniAuth::AuthHash.new(
      provider: "openid_connect",
      uid: uid,
      info: { name: "测试用户", nickname: handle, image: nil }
    )
    Rails.logger.info("[omniauth] dev OIDC mock enabled — @#{handle} (sub #{uid})")
  end
```

(Reuses the same `handle`/`uid` from `OMNIAUTH_MOCK_HANDLE`/`OMNIAUTH_MOCK_UID`; `OmniAuth.config.test_mode = true` is already set above. Both mocks may be registered when both providers are enabled.)

- [ ] **Step 2: Verify it boots and registers under the mock flag**

Run:
```bash
RAILS_ENV=development OMNIAUTH_MOCK=1 OIDC_ISSUER=https://example.com \
  OIDC_CLIENT_ID=x OIDC_CLIENT_SECRET=y AUTH_URL=http://localhost:3000 \
  bin/rails runner 'puts OmniAuth.config.mock_auth[:openid_connect].present?'
```
Expected: prints `true`.

- [ ] **Step 3: Commit**

```bash
git add config/initializers/omniauth_test_mode.rb
git commit -m "feat(rails): add OIDC dev mock for local login"
```

---

## Task 8: Document env vars

**Files:**
- Modify: `rails/.env.example`

- [ ] **Step 1: Add the OIDC section**

In `rails/.env.example`, after the existing `# ===== Twitter (X) OAuth 2.0 =====` block, add:

```bash
# ===== OpenID Connect (OIDC) — optional, independent of Twitter =====
# Presence of OIDC_ISSUER turns OIDC login on. Either provider may be enabled
# alone or together; with neither set, the login page shows a "not configured"
# notice. discovery uses <OIDC_ISSUER>/.well-known/openid-configuration.
# The callback below must be registered at the IdP, and AUTH_URL must match the
# origin actually serving the app (the redirect_uri is built from AUTH_URL):
#   <AUTH_URL>/users/auth/openid_connect/callback
OIDC_ISSUER=
OIDC_CLIENT_ID=
OIDC_CLIENT_SECRET=
# Login button label (default: "OIDC 登录")
OIDC_DISPLAY_NAME=
```

- [ ] **Step 2: Commit**

```bash
git add .env.example
git commit -m "docs(rails): document OIDC env vars in .env.example"
```

---

## Task 9: Full suite + lint + spec status update

- [ ] **Step 1: Run the whole test suite**

Run: `bundle exec rspec`
Expected: all green (no regressions in existing specs).

- [ ] **Step 2: Lint**

Run: `bin/rubocop -a`
Expected: no offenses (auto-correct any style nits introduced).

- [ ] **Step 3: Mark the spec status Implemented**

In `docs/specs/2026-06-12-oidc-login-design.md`, change the `Status:` line to `Implemented`.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore(rails): finalize OIDC login (lint, spec status)"
```

---

## Out of scope (do NOT implement)

- Email storage or email-based account matching (the `users` table has no email column).
- Cross-provider account linking / merging, or any "bind OIDC to my account" UI.
- Changes to `Settler` (OIDC accounts already match via `username`/`provider_account_id`).
- OIDC-specific error pages (failures fall through `Users::AuthFailure` → generic `/auth/error`).

## Verification checklist (after all tasks)

- [ ] `bundle exec rspec` green.
- [ ] OIDC-only: with only `OIDC_ISSUER`/client envs set, the login page shows only the OIDC button (label from `OIDC_DISPLAY_NAME`).
- [ ] Twitter-only (current behavior) unchanged: only the X button.
- [ ] Both set: two buttons.
- [ ] Neither set: "暂未配置登录方式" notice, no auth links.
- [ ] OIDC login creates a user with an `oidc` account; re-login refreshes avatar/handle but preserves edited nickname/emoji.
