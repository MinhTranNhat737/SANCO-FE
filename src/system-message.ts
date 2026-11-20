import { getLanguage, t } from './language.ts';

// Older saved games and socket payloads contain composed Vietnamese messages.
const eventMessages: [RegExp, string][] = [
  [/^Vòng (\d+–\d+): (.+)$/u, 'Rounds {0}: {1}'],
  [/^Thẻ (.+): nhận thưởng 200 triệu từ quỹ phát triển$/u, '{0}: Collect 200M from the Development Fund'],
  [/^Thẻ (.+): thanh toán 120 triệu phí bảo trì công trình$/u, '{0}: Pay 120M for building maintenance'],
  [/^Thẻ (.+): nhận 1 thẻ miễn phí rời Trại giam$/u, '{0}: Collect a Get Out of Jail Free card'],
  [/^Thẻ (.+): về Xuất phát, nhận (\d+) triệu$/u, '{0}: Advance to Start and collect {1}M'],
  [/^Thẻ (.+): bị áp giải vào Trại giam ngay lập tức$/u, '{0}: Go directly to jail'],
  [/^Thẻ (.+): lùi 3 ô đến (.+)$/u, '{0}: Move back three spaces to {1}'],
  [/^Rút trúng thẻ (.+) vào Trại giam$/u, 'Drew a Go to Jail card from {0}'],
  [/^Đến (.+); mua hoặc trả tiền thuê theo luật hiện hành$/u, 'Arrive at {0} and buy it or pay rent'],
  [/^Nhận (\d+) triệu khi đi qua Xuất phát$/u, 'Collect {0}M for passing Start'],
  [/^Nhận lương vòng mới \+(\d+) triệu$/u, 'Collect {0}M for starting a new round'],
  [/^Cần trả (\d+) tr · (.+)$/u, 'Amount due: {0}M · {1}'],
  [/^Nâng cấp (.+)$/u, 'Upgrade {0}'],
  [/^Thanh toán chuộc lại (.+)$/u, 'Redeem the mortgage on {0}'],
  [/^Trả sớm khoản vay #(\d+)$/u, 'Repay loan #{0} early'],
];

export function systemMessage(message: string | null | undefined): string {
  if (!message) return '';
  if (getLanguage() === 'vi') return message;
  const translated = t(message);
  if (translated !== message) return translated;
  for (const [pattern, template] of eventMessages) {
    const match = pattern.exec(message);
    if (match) return t(template, ...match.slice(1).map(tPart => t(tPart)));
  }
  return message;
}
