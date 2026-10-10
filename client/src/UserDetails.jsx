import { useEffect, useRef, useState } from "react";
import { userDetailSections } from "../../common/profile.js";
import { accountInitials } from "../../common/content.js";
import { uploadRules } from "../../common/api.js";

export function UserAvatar({ user, large = false }) {
  const [failed, setFailed] = useState("");
  return user?.profilePhoto && failed !== user.profilePhoto
    ? <img className={`user-photo ${large ? "user-photo-large" : ""}`} src={user.profilePhoto} alt="Your profile photo" onError={() => setFailed(user.profilePhoto)} />
    : <span className={`account-avatar ${large ? "user-photo-large" : ""}`}>{accountInitials(user?.fullName)}</span>;
}

export function UserDetails({ user, busy, onSave, onUpload }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const [camera, setCamera] = useState(false);
  const [ready, setReady] = useState(false);
  const video = useRef(null);
  const gallery = useRef(null);
  useEffect(() => {
    if (!file) { setPreview(""); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  useEffect(() => {
    if (!camera) return;
    let disposed = false;
    let stream;
    setReady(false);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Camera is unavailable. Use gallery upload or open the app over HTTPS.");
      setCamera(false);
      return;
    }
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false }).then(async value => {
      stream = value;
      if (disposed) { stream.getTracks().forEach(track => track.stop()); return; }
      video.current.srcObject = stream;
      await video.current.play();
    }).catch(() => {
      if (!disposed) { setError("Could not open the camera. Allow camera access or choose from gallery."); setCamera(false); }
    });
    return () => { disposed = true; stream?.getTracks().forEach(track => track.stop()); };
  }, [camera]);
  function select(value) {
    setError("");
    if (!value) return;
    if (!uploadRules.mimeTypes.includes(value.type)) { setError("Choose a JPEG, PNG or WebP photo."); return; }
    if (value.size > uploadRules.maxBytes) { setError("Choose a photo smaller than 4 MiB."); return; }
    setFile(value);
  }
  function capture() {
    const canvas = document.createElement("canvas");
    const source = video.current;
    const side = Math.min(source.videoWidth, source.videoHeight);
    if (!side) return;
    canvas.width = canvas.height = 768;
    canvas.getContext("2d").drawImage(source, (source.videoWidth - side) / 2, (source.videoHeight - side) / 2, side, side, 0, 0, 768, 768);
    canvas.toBlob(blob => {
      if (blob) { select(new File([blob], "profile.jpg", { type: "image/jpeg" })); setCamera(false); }
    }, "image/jpeg", 0.85);
  }
  return <>
    <section className="card user-photo-panel">
      <h3>Profile photo</h3>
      {preview ? <img className="user-photo user-photo-large" src={preview} alt="Selected profile photo preview" /> : <UserAvatar user={user} large />}
      <p className="muted">Use a clear photo of yourself. Review it before uploading.</p>
      <input ref={gallery} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={event => { select(event.target.files?.[0]); event.target.value = ""; }} />
      {camera && <div className="profile-camera"><video ref={video} muted playsInline onLoadedData={() => setReady(true)} aria-label="Profile camera preview" /><button type="button" disabled={!ready} onClick={capture}>Capture photo</button><button type="button" className="secondary" onClick={() => setCamera(false)}>Close camera</button></div>}
      <div className="farm-section-actions"><button type="button" className="secondary" disabled={busy || camera} onClick={() => { setError(""); setCamera(true); }}>Take photo</button><button type="button" className="secondary" disabled={busy || camera} onClick={() => gallery.current.click()}>Choose from gallery</button></div>
      {file && <div className="farm-section-actions"><button type="button" disabled={busy || camera} onClick={async () => { if (await onUpload(file)) setFile(null); }}>{busy ? "Uploading..." : "Upload photo"}</button><button type="button" className="secondary" disabled={busy} onClick={() => setFile(null)}>Cancel photo</button></div>}
      {error && <p role="alert" className="error">{error}</p>}
    </section>
    <form onSubmit={event => {
      event.preventDefault();
      const { fullName, ...userDetails } = Object.fromEntries(new FormData(event.currentTarget));
      void onSave(fullName, userDetails);
    }}>
      <section className="card"><h3>Personal details</h3><label>Full name<input name="fullName" defaultValue={user?.fullName} disabled={busy} autoComplete="name" required minLength={2} maxLength={150} /></label><label>Email address<input value={user?.email || ""} readOnly /></label></section>
      {userDetailSections.map(section => <section className="card" key={section.title}><h3>{section.title}</h3><div className="farm-field-grid">{section.fields.map(field => <label key={field.key} className={field.key.startsWith("addressLine") ? "farm-wide" : ""}>{field.label}<input name={field.key} defaultValue={user?.userDetails?.[field.key] || ""} placeholder={field.placeholder} disabled={busy} type={field.key.toLowerCase().includes("phone") ? "tel" : "text"} maxLength={field.key.toLowerCase().includes("phone") ? 30 : field.key === "postalCode" ? 20 : 300} /></label>)}</div></section>)}
      <small className="muted">Your personal address is saved separately from your farm address. Contact and address fields are optional.</small>
      <button disabled={busy}>{busy ? "Saving..." : "Save user details"}</button>
    </form>
  </>;
}
