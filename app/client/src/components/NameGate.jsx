import { useState } from "react";
import { setPlayerName } from "../lib/storage.js";

export default function NameGate({ onDone }) {
  const [value, setValue] = useState("");
  const valid = value.trim().length >= 2;

  const submit = (e) => {
    e.preventDefault();
    if (!valid) return;
    const name = value.trim().slice(0, 16);
    setPlayerName(name);
    onDone(name);
  };

  return (
    <div className="name-gate">
      <div className="name-card">
        <div className="dice-logo" aria-hidden="true">
          <span /><span /><span /><span /><span />
        </div>
        <h1>Yuk Main</h1>
        <p>Ular Tangga · Ludo · Halma. Main online atau lawan bot.</p>
        <form onSubmit={submit}>
          <input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Siapa namamu?"
            maxLength={16}
            aria-label="Nama pemain"
          />
          <button type="submit" disabled={!valid}>Mulai main</button>
        </form>
        <small>Nama tersimpan di perangkat ini dan dipakai untuk Hall of Fame.</small>
      </div>
    </div>
  );
}
