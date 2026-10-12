import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

const OBJECT_ID_PATTERN = /^[a-f0-9]{24}$/;

@Injectable()
export class ParseObjectIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!OBJECT_ID_PATTERN.test(value)) {
      throw new BadRequestException('id must be a 24-character hex ObjectId');
    }
    return value;
  }
}
