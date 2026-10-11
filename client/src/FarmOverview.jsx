import { useLocale } from "./locale";
import { overviewFarms, overviewCrops } from "../../common/farm-overview.js";
import { FarmDetails } from "./FarmDetails";

export function FarmOverview({ user, onAdd, busy, onSave }) {
  const localize = useLocale();
  const farms = overviewFarms(user);
  const hasCrops = farms.some((farm) => overviewCrops(farm).length > 0);
  return (
    <div className="farm-sections">
      <section className="farm-overview">
        <h3>{localize("Your farms and crops")}</h3>
        <p>
          {farms.length} {localize(farms.length === 1 ? "farm" : "farms")}
          {localize("saved. Expand a farm to view its land details and crops.")}
        </p>
        <button onClick={onAdd}>{localize("Add New Crop")}</button>
      </section>
      {!farms.length && (
        <section className="card">
          <h3>{localize("Start tracking your farm")}</h3>
          <p className="muted">
            {localize(
              "Add your farm details and first crop for easy tracking of your land, growing seasons, and crop history.",
            )}
          </p>
        </section>
      )}
      {!!farms.length && !hasCrops && (
        <section className="card">
          <h3>{localize("Start tracking your crops")}</h3>
          <p className="muted">
            {localize(
              "Your farm details are ready. Add your first crop to track its growth, season, and harvest in one place.",
            )}
          </p>
          <button onClick={onAdd}>{localize("Add New Crop")}</button>
        </section>
      )}
      {farms.map((farm) => (
        <details className="card farm-accordion" key={farm.id}>
          <summary>
            <strong>{farm.details.farmName || "Unnamed farm"}</strong>
            <span className="muted">
              {[farm.details.village, farm.details.district, farm.details.state]
                .filter(Boolean)
                .join(", ") || "Location not specified"}
            </span>
            <span>
              {farm.details.presentCrop || "No current crop"} ·{" "}
              {overviewCrops(farm).length}
              {localize("crop records")}
            </span>
          </summary>
          {!overviewCrops(farm).length && (
            <p className="muted">
              {localize(
                "Add your first crop to this farm to track its growth, season, and harvest in one place.",
              )}
            </p>
          )}
          <FarmDetails
            farms={farm.id === "profile-farm" ? [] : [farm]}
            details={farm.details}
            busy={busy}
            onSave={onSave}
            embedded
          />
        </details>
      ))}
    </div>
  );
}
