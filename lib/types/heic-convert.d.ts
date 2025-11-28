/**
 * Type definitions for heic-convert
 * @see https://www.npmjs.com/package/heic-convert
 */

declare module "heic-convert" {
  interface ConvertOptions {
    /**
     * Input HEIC/HEIF buffer
     */
    buffer: Buffer;

    /**
     * Output format
     */
    format: "JPEG" | "PNG";

    /**
     * Quality for JPEG output (0.0 - 1.0)
     * Only applicable when format is "JPEG"
     */
    quality?: number;
  }

  /**
   * Convert HEIC/HEIF image to JPEG or PNG
   * @param options - Conversion options
   * @returns Promise resolving to the converted image buffer
   */
  function convert(options: ConvertOptions): Promise<ArrayBuffer>;

  export = convert;
}
