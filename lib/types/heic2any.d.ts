declare module "heic2any" {
  interface Options {
    /**
     * The HEIC file blob
     */
    blob: Blob;
    /**
     * The output format
     * @default "image/jpeg"
     */
    toType?: "image/jpeg" | "image/png" | "image/gif";
    /**
     * The quality of the output image (0-1)
     * @default 0.92
     */
    quality?: number;
    /**
     * Whether to return multiple images (for HEIC containers with multiple images)
     * @default false
     */
    multiple?: boolean;
    /**
     * GIF interval (ms) for animated GIF
     */
    gifInterval?: number;
  }

  /**
   * Convert HEIC/HEIF images to JPEG/PNG/GIF
   */
  function heic2any(options: Options): Promise<Blob | Blob[]>;

  export default heic2any;
}
