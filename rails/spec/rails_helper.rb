# This file is copied to spec/ when you run 'rails generate rspec:install'
require 'spec_helper'
ENV['RAILS_ENV'] ||= 'test'
require_relative '../config/environment'
# Prevent database truncation if the environment is production
abort("The Rails environment is running in production mode!") if Rails.env.production?
require 'rspec/rails'
require 'webmock/rspec'
require 'turbo/broadcastable/test_helper'

# Ensures that the test database schema matches the current schema file.
begin
  ActiveRecord::Migration.maintain_test_schema!
rescue ActiveRecord::PendingMigrationError => e
  abort e.to_s.strip
end

RSpec.configure do |config|
  config.fixture_paths = [
    Rails.root.join('spec/fixtures')
  ]
  config.use_transactional_fixtures = true
  config.filter_rails_from_backtrace!

  # Tag specs by directory (spec/models -> type: :model, spec/requests ->
  # type: :request, ...) so shoulda-matchers and the Rails/Devise helpers mix in.
  config.infer_spec_type_from_file_location!

  config.include FactoryBot::Syntax::Methods
  config.include ActiveJob::TestHelper
  config.include Turbo::Broadcastable::TestHelper
  config.include Devise::Test::IntegrationHelpers, type: :request
end

Shoulda::Matchers.configure do |config|
  config.integrate do |with|
    with.test_framework :rspec
    with.library :rails
  end
end
