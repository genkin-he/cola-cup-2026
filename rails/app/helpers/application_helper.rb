module ApplicationHelper
  # Devise exposes `current_user` as a view helper once auth lands (阶段4).
  # Until then it is undefined, so guard against NameError and treat as anonymous.
  def signed_in_user
    current_user if respond_to?(:current_user)
  end

  # Mirrors the legacy Nav.isActive: the schedule tab also lights up on match
  # detail pages; every other tab matches on path prefix.
  def nav_tab_active?(href)
    path = request.path
    if href == "/"
      path == "/" || path.start_with?("/matches")
    else
      path.start_with?(href)
    end
  end
end
