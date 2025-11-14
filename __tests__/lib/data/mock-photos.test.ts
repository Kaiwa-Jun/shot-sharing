import { describe, it, expect } from "vitest";
import { mockPhotos } from "@/lib/data/mock-photos";

describe("mockPhotos", () => {
  describe("データ構造", () => {
    it("配列が20件のデータを含む", () => {
      expect(mockPhotos).toHaveLength(20);
    });

    it("すべてのアイテムが必須フィールドを持つ", () => {
      mockPhotos.forEach((photo, index) => {
        expect(photo, `Photo at index ${index}`).toHaveProperty("id");
        expect(photo, `Photo at index ${index}`).toHaveProperty("imageUrl");
        expect(photo, `Photo at index ${index}`).toHaveProperty("exifData");
      });
    });

    it("すべてのIDが文字列型である", () => {
      mockPhotos.forEach((photo, index) => {
        expect(
          typeof photo.id,
          `Photo ID at index ${index} should be string`
        ).toBe("string");
      });
    });

    it("すべてのIDがユニークである", () => {
      const ids = mockPhotos.map((photo) => photo.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(mockPhotos.length);
    });
  });

  describe("画像URL", () => {
    it("すべての画像URLがhttpsで始まる", () => {
      mockPhotos.forEach((photo, index) => {
        expect(
          photo.imageUrl,
          `Photo URL at index ${index} should start with https://`
        ).toMatch(/^https:\/\//);
      });
    });

    it("すべての画像URLがUnsplashドメインである", () => {
      mockPhotos.forEach((photo, index) => {
        expect(
          photo.imageUrl,
          `Photo URL at index ${index} should be from Unsplash`
        ).toContain("images.unsplash.com");
      });
    });

    it("すべての画像URLにクエリパラメータが含まれる", () => {
      mockPhotos.forEach((photo, index) => {
        expect(
          photo.imageUrl,
          `Photo URL at index ${index} should have query parameters`
        ).toMatch(/\?.*w=\d+.*h=\d+/);
      });
    });
  });

  describe("Exif情報", () => {
    it("Exif情報がオブジェクトである", () => {
      mockPhotos.forEach((photo, index) => {
        if (photo.exifData) {
          expect(
            typeof photo.exifData,
            `Exif data at index ${index} should be object`
          ).toBe("object");
        }
      });
    });

    it("ISO値が存在する場合、数値である", () => {
      mockPhotos.forEach((photo, index) => {
        if (photo.exifData?.iso !== undefined) {
          expect(
            typeof photo.exifData.iso,
            `ISO at index ${index} should be number`
          ).toBe("number");
          expect(
            photo.exifData.iso,
            `ISO at index ${index} should be positive`
          ).toBeGreaterThan(0);
        }
      });
    });

    it("F値が存在する場合、数値である", () => {
      mockPhotos.forEach((photo, index) => {
        if (photo.exifData?.fValue !== undefined) {
          expect(
            typeof photo.exifData.fValue,
            `F-value at index ${index} should be number`
          ).toBe("number");
          expect(
            photo.exifData.fValue,
            `F-value at index ${index} should be positive`
          ).toBeGreaterThan(0);
        }
      });
    });

    it("シャッタースピードが存在する場合、文字列である", () => {
      mockPhotos.forEach((photo, index) => {
        if (photo.exifData?.shutterSpeed !== undefined) {
          expect(
            typeof photo.exifData.shutterSpeed,
            `Shutter speed at index ${index} should be string`
          ).toBe("string");
          expect(
            photo.exifData.shutterSpeed,
            `Shutter speed at index ${index} should not be empty`
          ).not.toBe("");
        }
      });
    });

    it("露出補正が存在する場合、数値である", () => {
      mockPhotos.forEach((photo, index) => {
        if (photo.exifData?.exposureCompensation !== undefined) {
          expect(
            typeof photo.exifData.exposureCompensation,
            `Exposure compensation at index ${index} should be number`
          ).toBe("number");
        }
      });
    });
  });

  describe("Exif情報のバリエーション", () => {
    it("少なくとも1つの写真がISO値を持つ", () => {
      const hasIso = mockPhotos.some((photo) => photo.exifData?.iso);
      expect(hasIso).toBe(true);
    });

    it("少なくとも1つの写真がF値を持つ", () => {
      const hasFValue = mockPhotos.some((photo) => photo.exifData?.fValue);
      expect(hasFValue).toBe(true);
    });

    it("少なくとも1つの写真がシャッタースピードを持つ", () => {
      const hasShutterSpeed = mockPhotos.some(
        (photo) => photo.exifData?.shutterSpeed
      );
      expect(hasShutterSpeed).toBe(true);
    });

    it("少なくとも1つの写真が露出補正を持つ", () => {
      const hasExposureCompensation = mockPhotos.some(
        (photo) => photo.exifData?.exposureCompensation !== undefined
      );
      expect(hasExposureCompensation).toBe(true);
    });

    it("様々なISO値が含まれている（最低3種類）", () => {
      const isoValues = mockPhotos
        .map((photo) => photo.exifData?.iso)
        .filter((iso): iso is number => iso !== undefined);
      const uniqueIsoValues = new Set(isoValues);
      expect(uniqueIsoValues.size).toBeGreaterThanOrEqual(3);
    });

    it("様々なF値が含まれている（最低3種類）", () => {
      const fValues = mockPhotos
        .map((photo) => photo.exifData?.fValue)
        .filter((fValue): fValue is number => fValue !== undefined);
      const uniqueFValues = new Set(fValues);
      expect(uniqueFValues.size).toBeGreaterThanOrEqual(3);
    });
  });
});
