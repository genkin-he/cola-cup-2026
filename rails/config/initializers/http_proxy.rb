# Route the app's outbound HTTP through the corporate proxy when one is set.
# No-op when no proxy env var is present, so direct connections stay the default.
# See lib/http_proxy.rb for why a single setting must reach two env-var names.
# require_relative (not autoload) because constants must be resolved this early
# in boot, before Zeitwerk autoloading is usable from a config initializer.
require_relative "../../lib/http_proxy"

HttpProxy.normalize_env!
