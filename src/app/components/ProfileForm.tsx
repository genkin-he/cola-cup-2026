"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar } from "./Avatar";

const EMOJI_CHOICES = [
  "🦁", "🐯", "🐼", "🦊", "🐸", "🐙", "🦅", "🐺",
  "🦈", "🐲", "🦄", "🐢", "🐝", "🦖", "🐧", "🦉",
  "👑", "🚀", "⚡", "🔥", "🌟", "🎯", "🍺", "🥤",
];

export function ProfileForm({
  initialNickname,
  initialEmoji,
  avatarUrl,
}: {
  initialNickname: string;
  initialEmoji: string | null;
  avatarUrl: string | null;
}) {
  const router = useRouter();
  const [nickname, setNickname] = useState(initialNickname);
  const [emoji, setEmoji] = useState<string | null>(initialEmoji);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    setMsg(null);
    setSaving(true);
    const res = await fetch("/api/identity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname, emoji }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMsg(data.error ?? "保存失败");
      return;
    }
    setMsg("✅ 已保存，正在返回首页…");
    router.refresh();
    router.push("/");
  }

  const dirty = nickname !== initialNickname || emoji !== initialEmoji;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Avatar
          avatarUrl={avatarUrl}
          emoji={emoji}
          nickname={nickname || "你"}
          size="lg"
          ring="border-coke-red"
        />
        <span className="text-sm text-text-mid">头像预览</span>
      </div>

      <div>
        <label className="mb-1.5 block text-sm text-text-mid">昵称</label>
        <input
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          maxLength={16}
          className="w-full rounded-pill border border-border bg-bg-base px-4 py-2 text-text-hi outline-none transition focus:border-coke-red"
        />
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label className="text-sm text-text-mid">头像（可用 emoji 覆盖）</label>
          {emoji && (
            <button
              type="button"
              onClick={() => setEmoji(null)}
              className="text-xs text-text-low transition hover:text-text-hi"
            >
              ↩︎ 用回 Twitter 头像
            </button>
          )}
        </div>
        <div className="grid grid-cols-8 gap-1.5">
          {EMOJI_CHOICES.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setEmoji(e === emoji ? null : e)}
              className={`flex aspect-square items-center justify-center rounded-lg text-xl transition ${
                emoji === e
                  ? "bg-coke-red/20 ring-2 ring-coke-red"
                  : "bg-bg-elevated hover:bg-border"
              }`}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      {msg && <p className="text-xs text-text-mid">{msg}</p>}

      <button
        type="button"
        disabled={saving || !nickname.trim() || !dirty}
        onClick={save}
        className="w-full rounded-pill bg-coke-red px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-coke-red-700 disabled:opacity-40"
      >
        {saving ? "保存中…" : "保存"}
      </button>
    </div>
  );
}
