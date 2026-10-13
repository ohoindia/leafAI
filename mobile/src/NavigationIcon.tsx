import Svg, { Circle, Path } from "react-native-svg";

type NavigationRoute =
  | "market"
  | "weather"
  | "home"
  | "capture"
  | "history"
  | "services"
  | "profile" | "camera" | "gallery" | "farm" | "language" | "security";

export function NavigationIcon({
  route,
  selected,
  inverted = false,
}: {
  route: NavigationRoute;
  selected: boolean;
  inverted?: boolean;
}) {
  return (
    <Svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      stroke={inverted ? "#fff" : selected ? "#17673f" : "#20252c"}
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      accessible={false}
    >
      {route === "market" && (
        <Path d="M3 21h18M5 17v-4M10 17V9M15 17V5M20 17V3" />
      )}
      {route === "weather" && (
        <Path d="M7 18h11a4 4 0 0 0 0-8 6 6 0 0 0-11-1 4.5 4.5 0 0 0 0 9Z" />
      )}
      {route === "home" && (
        <Path d="m3 10 9-7 9 7M5 9v12h5v-7h4v7h5V9" />
      )}
      {route === "capture" && (
        <>
          <Circle cx={10.5} cy={10.5} r={7.5} />
          <Path d="m16 16 5 5" />
        </>
      )}
      {route === "services" && (
        <Path d="M3 3h7v7H3ZM14 3h7v7h-7ZM3 14h7v7H3ZM14 14h7v7h-7Z" />
      )}
      {route === "history" && (
        <>
          <Path d="M4 5v5h5 M4 10a8 8 0 1 1 0 5 M12 7v5l3 2" />
        </>
      )}
      {route === "profile" && (
        <>
          <Path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M4 21v-2a8 8 0 0 1 16 0v2" />
        </>
      )}
      {route === "camera" && <Path d="M3 7h5l2-3h4l2 3h5v13H3Z M16 13a4 4 0 1 1-8 0 4 4 0 0 1 8 0" />}
      {route === "gallery" && <Path d="M3 3h18v18H3Z m0 14 5-5 4 4 4-6 5 7 M8 7h.01" />}
      {route === "farm" && <Path d="M3 21h18M4 17l8-5 8 5M4 12l8-5 8 5M12 3v18" />}
      {route === "language" && <Path d="M3 12h18 M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M12 3c-5 5-5 13 0 18 5-5 5-13 0-18" />}
      {route === "security" && <Path d="M5 10h14v11H5Z M8 10V7a4 4 0 0 1 8 0v3" />}
    </Svg>
  );
}
