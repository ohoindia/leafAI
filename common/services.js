export const fertilizerPackage = "com.agristack.fsas";
export const fertilizerStore = `https://play.google.com/store/apps/details?id=${fertilizerPackage}`;
export const officerContacts = "https://www.tiryaniagriportal.in/officer-toolkit/officer-contacts";
export const fertilizerDescription = "Apply for subsidised fertilizer, choose an outlet, and use your approved QR code to purchase fertilizer at that outlet.";
export const officerDescription = "Find agriculture officers for local crop guidance, farmer services, and fertilizer support. Select your district, mandal, or cluster in the contact directory.";
export const locationNote = "Review the detected location. Mandal and cluster may need to be entered manually. Select these details on the officer contacts page after opening it.";
export async function resolveServiceLocation(latitude, longitude) {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.search = new URLSearchParams({ lat: String(latitude), lon: String(longitude), format: "json", zoom: "14", "accept-language": "en" }).toString();
  const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error("Could not detect your district. Enter your location manually.");
  const { address: a } = await response.json();
  if (a?.country_code !== "in") throw new Error("Enter your Indian district and mandal manually.");
  return {
    district: (a.state_district || "").replace(/ district$/i, ""),
    mandal: (a.county || "").replace(/ (mandal|tehsil|taluk)$/i, ""),
    cluster: "",
  };
}
