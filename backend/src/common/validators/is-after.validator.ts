import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

export function IsAfter(
  property: string,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isAfter',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [property],
      options: validationOptions,
      validator: {
        validate(value: string | number | Date, args: ValidationArguments) {
          const [relatedPropertyName] = args.constraints as string[];
          const relatedValue = (args.object as Record<string, any>)[
            relatedPropertyName
          ];
          if (!value || !relatedValue) return true;
          return (
            new Date(value).getTime() >
            new Date(relatedValue as string | number | Date).getTime()
          );
        },
      },
    });
  };
}
