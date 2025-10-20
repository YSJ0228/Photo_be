import { readFile } from 'fs/promises';
import path from 'path';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const cardPath = path.join(process.cwd(), 'DB', 'cards.json');
const userPath = path.join(process.cwd(), 'DB', 'users.json');

async function seed() {
  const rawCards = await readFile(cardPath, 'utf-8');
  const rawUsers = await readFile(userPath, 'utf-8');

  const cards = JSON.parse(rawCards);
  const users = JSON.parse(rawUsers);

  // 1. 유저 시딩
  for (const user of users) {
    const hashedPassword = await bcrypt.hash('12345678', 10);
    await prisma.user.create({
      data: {
        email: user.email,
        nickname: user.nickname,
        encryptedPassword: hashedPassword,
        point: {
          create: {
            balance: user.points || 0,
            lastDrawAt: new Date('2000-01-01T00:00:00Z'),
          },
        },
      },
    });
    console.log(`✅ Created user: ${user.nickname}`);
  }

  // 2. 카드 시딩
  for (const card of cards) {
    const userId = card.userId;

    const userExists = await prisma.user.findUnique({ where: { id: userId } });
    if (!userExists) {
      console.warn(`❗️ 유저 ID ${userId} 없음 → 카드 ${card.name} 건너뜀`);
      continue;
    }

    const { price, totalQuantity, remainingQuantity } = card;
    if (typeof price !== 'number' || typeof totalQuantity !== 'number') {
      console.warn(
        `❗️ price 또는 totalQuantity 누락 → 카드 ${card.name} 건너뜀`,
      );
      continue;
    }

    // 3. 포토카드 생성
    const photoCard = await prisma.photoCard.create({
      data: {
        name: card.name,
        description: card.description,
        genre: card.genre.toUpperCase(),
        grade: card.grade.toUpperCase(),
        imageUrl: card.imageUrl,
        price,
        initialQuantity: totalQuantity,
        creator: {
          connect: { id: userId },
        },
      },
    });

    const userCardIds = [];
    const statusList = [];

    for (let i = 0; i < totalQuantity; i++) {
      let status = 'IDLE';

      if (remainingQuantity < totalQuantity) {
        status = i < remainingQuantity ? 'LISTED' : 'SOLD';
      }

      const userCard = await prisma.userCard.create({
        data: {
          userId,
          photoCardId: photoCard.id,
          status,
        },
      });

      if (status === 'LISTED' || status === 'SOLD') {
        userCardIds.push({ id: userCard.id });
      }

      statusList.push(status);
    }

    // 4. 상점 등록 (IDLE 제외)
    if (userCardIds.length > 0) {
      await prisma.shop.create({
        data: {
          price,
          initialQuantity: totalQuantity,
          remainingQuantity,
          listingType: 'FOR_SALE',
          seller: { connect: { id: userId } },
          photoCard: { connect: { id: photoCard.id } },
          listedItems: { connect: userCardIds },
        },
      });
    }

    console.log(
      `✅ Seeded card: ${card.name
      } (userId: ${userId}) → UserCards: ${statusList.join(', ')}`,
    );
  }
}

seed()
  .catch(err => {
    console.error('❌ 시딩 중 에러 발생:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
