import { Card, Row, Col, Statistic } from 'antd';
import type { ReactNode } from 'react';

interface StatisticCardProps {
    title: string;
    value: number;
    prefix?: ReactNode;
    color?: string;
}

interface StatisticsCardsProps {
    cards: StatisticCardProps[];
}

export const StatisticsCards: React.FC<StatisticsCardsProps> = ({ cards }) => {
    const getColSpan = (totalCards: number) => {
        // Responsive column spans based on number of cards
        if (totalCards === 4) {
            return { xs: 12, sm: 12, md: 6, lg: 6 };
        }
        if (totalCards === 5) {
            return { xs: 24, sm: 12, md: 12, lg: 4 };
        }
        // Default for 3 cards or other
        return { xs: 24, sm: 12, md: 8, lg: 8 };
    };

    const colSpan = getColSpan(cards.length);

    return (
        <Row gutter={16} className="mb-6">
            {cards.map((card, index) => (
                <Col key={index} {...colSpan}>
                    <Card>
                        <Statistic
                            title={card.title}
                            value={card.value}
                            prefix={card.prefix}
                            valueStyle={{ color: card.color }} // Keep for dynamic color from Props
                        />
                    </Card>
                </Col>
            ))}
        </Row>
    );
};
