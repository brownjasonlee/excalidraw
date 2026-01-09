import { promiseTry, LOCAL_FONT_PROTOCOL } from "@excalidraw/common";

type DataURL = string;

export class ExcalidrawFontFace {
  public readonly urls: URL[] | DataURL[];
  public readonly fontFace: FontFace;

  private static readonly ASSETS_FALLBACK_URL = `https://esm.sh/${
    import.meta.env.PKG_NAME
      ? `${import.meta.env.PKG_NAME}@${import.meta.env.PKG_VERSION}` // is provided during package build
      : "@excalidraw/excalidraw" // fallback to the latest package version (i.e. for app)
  }/dist/prod/`;

  constructor(family: string, uri: string, descriptors?: FontFaceDescriptors) {
    this.urls = ExcalidrawFontFace.createUrls(uri);

    const sources = this.urls
      .map((url) => `url(${url}) ${ExcalidrawFontFace.getFormat(url)}`)
      .join(", ");

    this.fontFace = new FontFace(family, sources, {
      display: "swap",
      style: "normal",
      weight: "400",
      ...descriptors,
    });
  }

  /**
   * Generates CSS `@font-face` definition with the (subsetted) font source as a data url for the characters within the unicode range.
   *
   * Retrieves `undefined` otherwise.
   */
  public toCSS(characters: string): Promise<string> | undefined {
    // quick exit in case the characters are not within this font face's unicode range
    if (!this.getUnicodeRangeRegex().test(characters)) {
      return;
    }

    const codepoints = Array.from(characters).map(
      (char) => char.codePointAt(0)!,
    );

    return this.getContent(codepoints).then(
      (content) =>
        `@font-face { font-family: ${this.fontFace.family}; src: url(${content}); }`,
    );
  }

  /**
   * Tries to fetch woff2 content, based on the registered urls (from first to last, treated as fallbacks).
   *
   * @returns url string for the first available font source
   */
  public async getContent(codePoints: Array<number>): Promise<string> {
    const url = this.urls[0];
    return url ? url.toString() : "";
  }

  private getUnicodeRangeRegex() {
    // using \u{h} or \u{hhhhh} to match any number of hex digits,
    // otherwise we would get an "Invalid Unicode escape" error
    // e.g. U+0-1007F -> \u{0}-\u{1007F}
    const unicodeRangeRegex = this.fontFace.unicodeRange
      .split(/,\s*/)
      .map((range) => {
        const [start, end] = range.replace("U+", "").split("-");
        if (end) {
          return `\\u{${start}}-\\u{${end}}`;
        }

        return `\\u{${start}}`;
      })
      .join("");

    return new RegExp(`[${unicodeRangeRegex}]`, "u");
  }

  private static createUrls(uri: string): URL[] | DataURL[] {
    if (uri.startsWith("data")) {
      // don't create the URL instance, as parsing the huge dataurl string is expensive
      return [uri];
    }

    if (uri.startsWith(LOCAL_FONT_PROTOCOL)) {
      // no url for local fonts
      return [];
    }

    if (uri.startsWith("http")) {
      // one url for http imports or data url
      return [new URL(uri)];
    }

    if (uri.startsWith("/@") || uri.startsWith("/assets/")) {
      // vite dev server absolute paths (e.g. /@fs/...)
      return [new URL(uri, window.location.origin)];
    }

    // absolute assets paths, which are found in tests and excalidraw-app build, won't work with base url, so we are stripping initial slash away
    const assetUrl: string = uri.replace(/^\/+/, "");
    const urls: URL[] = [];

    if (typeof window.EXCALIDRAW_ASSET_PATH === "string") {
      const normalizedBaseUrl = this.normalizeBaseUrl(
        window.EXCALIDRAW_ASSET_PATH,
      );

      urls.push(new URL(assetUrl, normalizedBaseUrl));
    } else if (Array.isArray(window.EXCALIDRAW_ASSET_PATH)) {
      window.EXCALIDRAW_ASSET_PATH.forEach((path) => {
        const normalizedBaseUrl = this.normalizeBaseUrl(path);
        urls.push(new URL(assetUrl, normalizedBaseUrl));
      });
    }

    // fallback url for bundled fonts
    urls.push(new URL(assetUrl, ExcalidrawFontFace.ASSETS_FALLBACK_URL));

    return urls;
  }

  private static getFormat(url: URL | DataURL) {
    if (!(url instanceof URL)) {
      // format is irrelevant for data url
      return "";
    }

    try {
      const parts = new URL(url).pathname.split(".");

      if (parts.length === 1) {
        return "";
      }

      return `format('${parts.pop()}')`;
    } catch (error) {
      return "";
    }
  }

  private static normalizeBaseUrl(baseUrl: string) {
    let result = baseUrl;

    // in case user passed a root-relative url (~absolute path),
    // like "/" or "/some/path", or relative (starts with "./"),
    // prepend it with `location.origin`
    if (/^\.?\//.test(result)) {
      result = new URL(
        result.replace(/^\.?\/+/, ""),
        window?.location?.origin,
      ).toString();
    }

    // ensure there is a trailing slash, otherwise url won't be correctly concatenated
    result = `${result.replace(/\/+$/, "")}/`;

    return result;
  }
}
