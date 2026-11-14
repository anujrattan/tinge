export type PrintTypeId = "framed-acp" | "canvas" | "sunboard" | "neon";

export type AcpCut = {
  id: string;
  name: string;
  size: string;
  panels: string;
  bestFor: string;
};

/** Cuts that fill a 12 ft × 4 ft ACP sheet with no offcut. */
export const ACP_CUTS: AcpCut[] = [
  {
    id: "statement",
    name: "Statement",
    size: "12 × 4 ft",
    panels: "1 panel, the whole sheet",
    bestFor: "A feature wall",
  },
  {
    id: "pair",
    name: "Pair",
    size: "6 × 4 ft",
    panels: "2 panels from one sheet",
    bestFor: "A wide sofa wall",
  },
  {
    id: "triptych",
    name: "Triptych",
    size: "4 × 4 ft",
    panels: "3 panels from one sheet",
    bestFor: "A three-panel set",
  },
  {
    id: "gallery",
    name: "Gallery",
    size: "6 × 2 ft",
    panels: "4 panels from one sheet",
    bestFor: "Above a bed or console",
  },
  {
    id: "home",
    name: "Home",
    size: "4 × 2 ft",
    panels: "6 panels from one sheet",
    bestFor: "A normal room",
  },
  {
    id: "desk",
    name: "Desk",
    size: "3 × 2 ft",
    panels: "8 panels from one sheet",
    bestFor: "A study or a tight wall",
  },
];

export type PrintType = {
  id: PrintTypeId;
  name: string;
  tag: string;
  summary: string;
  detail: string;
  arrives: string;
  sizes: string;
};

export const PRINT_TYPES: PrintType[] = [
  {
    id: "framed-acp",
    name: "Framed ACP",
    tag: "The main piece",
    summary: "UV print on an aluminium composite panel, then a frame.",
    detail:
      "The sheet is 12 ft by 4 ft. Every size we sell is a cut that fills that sheet, from one statement panel down to eight smaller pieces. You pick a listed size. You do not type a measurement.",
    arrives: "Printed, framed, and ready to hang.",
    sizes: "Six sizes, from 12 × 4 ft to 3 × 2 ft",
  },
  {
    id: "canvas",
    name: "Canvas",
    tag: "Softer rooms",
    summary: "The same artwork, printed on canvas.",
    detail:
      "Canvas is for rooms that want a textile surface instead of a hard panel. Sizes stay on the list. A canvas is not a paper poster and it is not a framed ACP.",
    arrives: "A stretched canvas print.",
    sizes: "Gallery, home, desk, and a 4 × 4 ft triptych",
  },
  {
    id: "sunboard",
    name: "Sunboard",
    tag: "Lighter and simpler",
    summary: "A rigid foam panel. Easier to print, easier to price.",
    detail:
      "Sunboard is the light rigid print for a hostel wall, a studio, or a first piece. It is not a framed ACP and it is not a roll of paper. Tape or screws hold it. No frame is included unless you ask for one.",
    arrives: "A flat printed panel.",
    sizes: "The smaller cuts: gallery, home, and desk",
  },
  {
    id: "neon",
    name: "Neon",
    tag: "Light, not a sheet",
    summary: "Neon signs made in the same studio.",
    detail:
      "Neon is lettering or a shape, not a poster cut from the ACP sheet. Tell us the words and the wall. We confirm the size before we make it.",
    arrives: "A finished sign, ready to mount.",
    sizes: "Made to the wording, confirmed before production",
  },
];

export const getPrintType = (id: string): PrintType | undefined =>
  PRINT_TYPES.find((type) => type.id === id);
