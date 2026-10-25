export function formatOrdinal(n: number): string {
  const rounded = Math.floor(n);
  const mod100 = Math.abs(rounded) % 100;
  if (mod100 >= 11 && mod100 <= 13) {
    return `${rounded}th`;
  }
  const mod10 = Math.abs(rounded) % 10;
  switch (mod10) {
    case 1:
      return `${rounded}st`;
    case 2:
      return `${rounded}nd`;
    case 3:
      return `${rounded}rd`;
    default:
      return `${rounded}th`;
  }
}
