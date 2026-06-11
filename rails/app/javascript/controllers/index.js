// Import and register all your controllers from the importmap via controllers/**/*_controller
//
// IMPORTANT: do NOT run `bin/rails stimulus:manifest:update`. With propshaft's
// digested assets, the manifest it generates uses RELATIVE imports
// (`import X from "./foo_controller"`) which bypass the importmap and 404 — that
// silently breaks Stimulus app-wide. eagerLoadControllersFrom resolves the
// bare `controllers/*` specifiers through the importmap and auto-registers every
// controller, so new controllers need no edits here.
import { application } from "controllers/application"
import { eagerLoadControllersFrom } from "@hotwired/stimulus-loading"
eagerLoadControllersFrom("controllers", application)
