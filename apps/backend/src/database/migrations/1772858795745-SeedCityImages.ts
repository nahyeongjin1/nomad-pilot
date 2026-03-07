import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedCityImages1772858795745 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE cities SET image_url = 'https://images.unsplash.com/photo-1673944083714-92ee2061e25c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w4ODk1NzF8MHwxfHNlYXJjaHwxfHxUb2t5byUyMGNpdHklMjBza3lsaW5lfGVufDB8MHx8fDE3NzI4NTg2OTh8MA&ixlib=rb-4.1.0&q=80&w=1080', image_author_name = 'kiki', image_author_url = 'https://unsplash.com/@yungchi1104' WHERE name_en = 'Tokyo'`,
    );
    await queryRunner.query(
      `UPDATE cities SET image_url = 'https://images.unsplash.com/photo-1756460886147-1804661e8a0f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w4ODk1NzF8MHwxfHNlYXJjaHwxfHxPc2FrYSUyMGNpdHklMjBza3lsaW5lfGVufDB8MHx8fDE3NzI4NTg2OTh8MA&ixlib=rb-4.1.0&q=80&w=1080', image_author_name = 'Cuvii', image_author_url = 'https://unsplash.com/@cuvii' WHERE name_en = 'Osaka'`,
    );
    await queryRunner.query(
      `UPDATE cities SET image_url = 'https://images.unsplash.com/photo-1669954791579-15a45890449f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w4ODk1NzF8MHwxfHNlYXJjaHwxfHxLeW90byUyMHRlbXBsZXxlbnwwfDB8fHwxNzcyODU4Njk5fDA&ixlib=rb-4.1.0&q=80&w=1080', image_author_name = 'Griffin Quinn', image_author_url = 'https://unsplash.com/@griffinquinn' WHERE name_en = 'Kyoto'`,
    );
    await queryRunner.query(
      `UPDATE cities SET image_url = 'https://images.unsplash.com/photo-1658167864615-1fdd55c157c6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w4ODk1NzF8MHwxfHNlYXJjaHwxfHxGdWt1b2thJTIwY2l0eXxlbnwwfDB8fHwxNzcyODU4NzAwfDA&ixlib=rb-4.1.0&q=80&w=1080', image_author_name = 'Björn', image_author_url = 'https://unsplash.com/@camaradon' WHERE name_en = 'Fukuoka'`,
    );
    await queryRunner.query(
      `UPDATE cities SET image_url = 'https://images.unsplash.com/photo-1771333808522-bdf42ae18eed?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w4ODk1NzF8MHwxfHNlYXJjaHwxfHxTYXBwb3JvJTIwY2l0eXxlbnwwfDB8fHwxNzcyODU4NzAxfDA&ixlib=rb-4.1.0&q=80&w=1080', image_author_name = 'Huang Lin', image_author_url = 'https://unsplash.com/@habobo' WHERE name_en = 'Sapporo'`,
    );
    await queryRunner.query(
      `UPDATE cities SET image_url = 'https://images.unsplash.com/photo-1543719251-6215a497f647?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w4ODk1NzF8MHwxfHNlYXJjaHwxfHxOYWhhJTIwT2tpbmF3YSUyMGNpdHl8ZW58MHwwfHx8MTc3Mjg1ODc4Mnww&ixlib=rb-4.1.0&q=80&w=1080', image_author_name = 'Julie Fader', image_author_url = 'https://unsplash.com/@jlfader' WHERE name_en = 'Naha'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE cities SET image_url = NULL, image_author_name = NULL, image_author_url = NULL WHERE name_en IN ('Tokyo', 'Osaka', 'Kyoto', 'Fukuoka', 'Sapporo', 'Naha')`,
    );
  }
}
