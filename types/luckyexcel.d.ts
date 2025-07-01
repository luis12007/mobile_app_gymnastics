declare module "read-excel-file" {
  interface ReadOptions {
    sheet?: string | number;
    dateFormat?: string;
    timeFormat?: string;
    transformData?: (data: any[][]) => any[][];
  }

  function readXlsxFile(
    file: File | Blob | ArrayBuffer,
    options?: ReadOptions
  ): Promise<any[][]>;

  export default readXlsxFile;
}
