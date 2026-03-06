// PDFBooklet - PDFを左綴じ・右綴じの形式に変換するツール

//pdf-libをCDNから読み込む
const { PDFDocument } = PDFLib;

const fileInput = document.getElementById('pdfInput');
const btnLeftBind = document.getElementById('btnLeftBind');
const btnRightBind = document.getElementById('btnRightBind');
const statusDiv = document.getElementById('status');

let isLeftBindMode = true;

// 左綴じモードのボタンイベント
btnLeftBind.addEventListener('click', () => {
    isLeftBindMode = true;
    fileInput.value = '';
    fileInput.click();
});

// 右綴じモードのボタンイベント
btnRightBind.addEventListener('click', () => {
    isLeftBindMode = false;
    fileInput.value = '';
    fileInput.click();
});

// ファイル選択イベント
fileInput.addEventListener('change', async (e) => {
    if (e.target.files.length > 0) {
        const selectedFile = e.target.files[0];
        await processPdf(isLeftBindMode, selectedFile);
    }
});

// PDF処理関数
async function processPdf(isLeftBind, file) {
    try {
        // ボタンを無効化して処理中の状態を表示
        btnLeftBind.disabled = true;
        btnRightBind.disabled = true;
        statusDiv.textContent = `「${file.name}」を${isLeftBind ? '左綴じ' : '右綴じ'}で変換中...`;

        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        const originalPageCount = pdfDoc.getPageCount();
        
        // ページ数を4の倍数に調整
        let totalPages = originalPageCount;
        while (totalPages % 4 !== 0) { totalPages++; }

        // 新しいPDFドキュメントを作成
        const newPdf = await PDFDocument.create();
        const firstPage = pdfDoc.getPage(0);
        const { width, height } = firstPage.getSize();
        const newWidth = width * 2;
        const newHeight = height;

        const pageIndices = Array.from({ length: originalPageCount }, (_, i) => i);
        const embeddedPages = await newPdf.embedPdf(pdfDoc, pageIndices);

        // ページを左綴じ・右綴じの順序で配置
        for (let i = 0; i < totalPages / 2; i++) {
            const newPage = newPdf.addPage([newWidth, newHeight]);
            let leftIndex, rightIndex;

            if (isLeftBind) {
                if (i % 2 === 0) {
                    leftIndex = totalPages - 1 - i;
                    rightIndex = i;
                } else {
                    leftIndex = i;
                    rightIndex = totalPages - 1 - i;
                }
            } else {
                if (i % 2 === 0) {
                    leftIndex = i;
                    rightIndex = totalPages - 1 - i;
                } else {
                    leftIndex = totalPages - 1 - i;
                    rightIndex = i;
                }
            }

            if (embeddedPages[leftIndex]) {
                newPage.drawPage(embeddedPages[leftIndex], { x: 0, y: 0, width: width, height: height });
            }
            if (embeddedPages[rightIndex]) {
                newPage.drawPage(embeddedPages[rightIndex], { x: width, y: 0, width: width, height: height });
            }
        }

        // PDFを保存してダウンロード
        const pdfBytes = await newPdf.save();
        const bindName = isLeftBind ? 'left' : 'right';
        const baseName = file.name.replace(/\.[^/.]+$/, "");
        const newFileName = `${baseName}_booklet_${bindName}.pdf`;
        download(pdfBytes, newFileName, "application/pdf");

        statusDiv.textContent = '完了しました！ダウンロードが始まります。';
        
    } catch (error) {
        console.error(error);
        statusDiv.textContent = 'エラーが発生しました。PDFファイルを確認してください。';
    } finally {
        btnLeftBind.disabled = false;
        btnRightBind.disabled = false;
    }
}

// ダウンロード関数
function download(data, filename, type) {
    const blob = new Blob([data], { type: type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}