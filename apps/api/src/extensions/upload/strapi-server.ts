import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

export default (plugin) => {
  const imageManipulationService = plugin.services['image-manipulation'];

  plugin.services['image-manipulation'] = ({ strapi }) => {
    const baseService =
      typeof imageManipulationService === 'function'
        ? imageManipulationService({ strapi })
        : imageManipulationService;

    if (!baseService || typeof baseService.optimize !== 'function') {
      strapi.log.error(
        'Upload: Nie udało się zainicjalizować bazowego serwisu image-manipulation.'
      );
      return baseService ?? {};
    }

    const baseOptimize = baseService.optimize.bind(baseService);

    const writeStreamToFile = (stream: NodeJS.ReadableStream, targetPath: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        const output = fs.createWriteStream(targetPath);
        stream.on('error', reject);
        output.on('error', reject);
        output.on('close', () => resolve());
        stream.pipe(output);
      });
    };

    return {
      ...baseService,
      async optimize(file) {
        const allowedInputMimes = ['image/jpeg', 'image/png', 'image/tiff', 'image/avif'];
        const reoptimizeWebp = strapi.config.get('plugin::upload.reoptimizeWebp', false);

        if (file.mime === 'image/webp' && !reoptimizeWebp) {
          strapi.log.debug(`Upload: Pomijanie re-optymalizacji WebP dla ${file.name}`);
          return file;
        }

        if (!allowedInputMimes.includes(file.mime)) {
          return baseOptimize(file);
        }

        try {
          const uploadSettings = (await strapi.plugin('upload').service('upload').getSettings()) ?? {};
          const sizeOptimization = Boolean(uploadSettings.sizeOptimization);
          const autoOrientation = Boolean(uploadSettings.autoOrientation);
          const originalName = path.parse(file.name).name;
          const originalSizeInBytes =
            typeof file.sizeInBytes === 'number'
              ? file.sizeInBytes
              : file.filepath
                ? fs.statSync(file.filepath).size
                : Math.round((Number(file.size) || 0) * 1024);

          const outputFileName = `optimized-${file.hash}.webp`;
          const outputPath = file.tmpWorkingDirectory
            ? path.join(file.tmpWorkingDirectory, outputFileName)
            : outputFileName;

          const transformer = file.filepath ? sharp(file.filepath) : sharp();

          if (autoOrientation) {
            transformer.rotate();
          }

          transformer.webp({
            quality: sizeOptimization ? 80 : 100,
            effort: 4,
          });

          let newInfo: sharp.OutputInfo | null = null;

          if (file.filepath) {
            newInfo = await transformer.toFile(outputPath);
          } else {
            transformer.on('info', (info) => {
              newInfo = info;
            });
            await writeStreamToFile(file.getStream().pipe(transformer), outputPath);
          }

          const outputSizeInBytes = newInfo?.size ?? fs.statSync(outputPath).size;

          if (outputSizeInBytes > originalSizeInBytes) {
            strapi.log.debug(
              `Upload: Pominięto WebP dla ${file.name} (wynik większy: ${outputSizeInBytes} > ${originalSizeInBytes}).`
            );
            return file;
          }

          file.filepath = outputPath;
          file.getStream = () => fs.createReadStream(outputPath);
          file.sizeInBytes = outputSizeInBytes;
          file.size = outputSizeInBytes / 1024;
          file.ext = '.webp';
          file.mime = 'image/webp';
          file.name = `${originalName}.webp`;
          file.width = newInfo?.width ?? file.width;
          file.height = newInfo?.height ?? file.height;

          strapi.log.debug(
            `Upload: Zoptymalizowano ${file.name} do WebP (${file.size.toFixed(2)} KB).`
          );

          return file;
        } catch (error) {
          strapi.log.error('Błąd podczas optymalizacji obrazu w rozszerzeniu:', error);
          return baseOptimize(file);
        }
      },
    };
  };

  return plugin;
};
