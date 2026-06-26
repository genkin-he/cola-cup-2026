# Repository Guidelines

## Project Structure & Module Organization

This is a Rails 8 app for Cola Cup 2026. Core application code lives in `app/`: models in `app/models`, controllers in `app/controllers`, jobs in `app/jobs`, helpers in `app/helpers`, views in `app/views`, and Stimulus controllers in `app/javascript/controllers`. Styles and compiled assets live under `app/assets`, with Tailwind input in `app/assets/tailwind/application.css`. Database migrations and seed data are in `db/`; static World Cup data is in `db/data/openfootball`. Specs mirror app areas under `spec/models`, `spec/requests`, `spec/jobs`, `spec/helpers`, and `spec/lib`.

## Build, Test, and Development Commands

- `bundle install`: install Ruby dependencies.
- `bin/rails db:prepare`: create or migrate the SQLite databases.
- `bin/rails db:seed`: import teams and match schedule data.
- `bin/dev`: start Rails, Tailwind watch, and Solid Queue workers.
- `bundle exec rspec`: run the full RSpec suite.
- `bin/rubocop`: run Ruby style checks.
- `bin/brakeman`: run Rails security analysis.
- `bin/bundler-audit`: check gems for known vulnerabilities.
- `bin/ci`: run setup, RuboCop, bundler-audit, and Brakeman as configured in `config/ci.rb`.
- `npm run build`: bundle JavaScript into `app/assets/builds`.

## Coding Style & Naming Conventions

Ruby follows `rubocop-rails-omakase` via `.rubocop.yml`; prefer conventional Rails names such as singular models (`Match`) and plural controllers (`MatchesController`). Keep specs named after the unit or workflow they cover, for example `spec/models/match_spec.rb` or `spec/requests/admin/users_spec.rb`. JavaScript controllers use Stimulus naming such as `vote_panel_controller.js`. Do not run `bin/rails stimulus:manifest:update`; controllers are auto-loaded from `app/javascript/controllers`.

## Testing Guidelines

Use RSpec with FactoryBot and Shoulda Matchers. Networked integrations must be stubbed; WebMock is enabled for tests. Add model specs for business rules, request specs for user-visible flows, job specs for background work, and focused lib specs for service objects. Run `bundle exec rspec` before handing off changes that affect settlement, voting, authentication, or background jobs.

## Commit & Pull Request Guidelines

Recent commits use conventional, scoped messages such as `feat(scorers): ...`, `fix(auth): ...`, `test(auth): ...`, and `perf: ...`. Keep commits focused and describe behavior, not implementation trivia. Pull requests should include a short summary, tests run, linked issues if applicable, screenshots for UI changes, and notes for migrations, seeds, environment variables, or deployment impacts.

## Security & Configuration Tips

Keep secrets in `.env`; do not commit real OAuth credentials or API keys. SQLite data under `storage/` is runtime state, not source. Admin and settlement behavior is sensitive, so pair changes there with request or model coverage and run security checks when touching authentication, redirects, or external HTTP clients.
