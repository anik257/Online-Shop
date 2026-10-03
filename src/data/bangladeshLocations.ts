export interface DivisionData {
  id: string
  name: string
  districts: string[]
}

export const BANGLADESH_DIVISIONS: DivisionData[] = [
  {
    id: 'dhaka',
    name: 'Dhaka',
    districts: [
      'Dhaka',
      'Gazipur',
      'Kishoreganj',
      'Manikganj',
      'Munshiganj',
      'Narayanganj',
      'Narsingdi',
      'Tangail',
      'Faridpur',
      'Gopalganj',
      'Madaripur',
      'Rajbari',
      'Shariatpur',
    ],
  },
  {
    id: 'chattogram',
    name: 'Chattogram',
    districts: [
      'Chattogram',
      'Cox\'s Bazar',
      'Cumilla',
      'Feni',
      'Brahmanbaria',
      'Noakhali',
      'Chandpur',
      'Lakshmipur',
      'Rangamati',
      'Khagrachhari',
      'Bandarban',
    ],
  },
  {
    id: 'rajshahi',
    name: 'Rajshahi',
    districts: [
      'Rajshahi',
      'Bogura',
      'Joypurhat',
      'Naogaon',
      'Natore',
      'Chapainawabganj',
      'Pabna',
      'Sirajganj',
    ],
  },
  {
    id: 'khulna',
    name: 'Khulna',
    districts: [
      'Khulna',
      'Bagerhat',
      'Chuadanga',
      'Jashore',
      'Jhenaidah',
      'Kushtia',
      'Magura',
      'Meherpur',
      'Narail',
      'Satkhira',
    ],
  },
  {
    id: 'barishal',
    name: 'Barishal',
    districts: [
      'Barishal',
      'Barguna',
      'Bhola',
      'Jhalokathi',
      'Patuakhali',
      'Pirojpur',
    ],
  },
  {
    id: 'sylhet',
    name: 'Sylhet',
    districts: [
      'Sylhet',
      'Habiganj',
      'Moulvibazar',
      'Sunamganj',
    ],
  },
  {
    id: 'rangpur',
    name: 'Rangpur',
    districts: [
      'Rangpur',
      'Dinajpur',
      'Gaibandha',
      'Kurigram',
      'Lalmonirhat',
      'Nilphamari',
      'Panchagarh',
      'Thakurgaon',
    ],
  },
  {
    id: 'mymensingh',
    name: 'Mymensingh',
    districts: [
      'Mymensingh',
      'Jamalpur',
      'Netrokona',
      'Sherpur',
    ],
  },
]

export const ALL_DISTRICTS = BANGLADESH_DIVISIONS.flatMap((div) => div.districts).sort()
